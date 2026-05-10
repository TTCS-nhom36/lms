package com.ttcs.backend.service;

import com.ttcs.backend.dto.response.ChatMessageResponse;
import com.ttcs.backend.entity.ChatMessage;
import com.ttcs.backend.entity.ChatMessage.MessageRole;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.repository.ChatMessageRepository;
import com.ttcs.backend.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final ChatIntentParser chatIntentParser;
    private final ChatBusinessService chatBusinessService;
    private final ChatPromptBuilder chatPromptBuilder;
    private final ChatClient chatClient;

    public ChatService(
            ChatMessageRepository chatMessageRepository,
            UserRepository userRepository,
            CurrentUserService currentUserService,
            ChatIntentParser chatIntentParser,
            ChatBusinessService chatBusinessService,
            ChatPromptBuilder chatPromptBuilder,
            ChatClient.Builder chatClientBuilder) {
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.chatIntentParser = chatIntentParser;
        this.chatBusinessService = chatBusinessService;
        this.chatPromptBuilder = chatPromptBuilder;
        this.chatClient = chatClientBuilder.build();
    }

    @Transactional
    public ChatMessageResponse sendMessage(String userMessage) {
        UUID userId = currentUserService.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        ChatMessage userMsg = ChatMessage.builder()
                .user(user)
                .role(MessageRole.USER)
                .content(userMessage)
                .build();
        chatMessageRepository.save(userMsg);

        List<ChatMessage> recentMessages = chatMessageRepository
                .findByUserOrderByCreatedAtDesc(user, PageRequest.of(0, 20));
        List<ChatMessage> chronological = new ArrayList<>(recentMessages.reversed());

        ChatIntentAnalysis intent = chatIntentParser.parse(userMessage);
        log.info("Chat intent parsed: {}", intent.types());

        ChatRelevantData relevantData = chatBusinessService.findRelevantData(user, intent, userMessage);
        log.info("Relevant data retrieved: {} chars", relevantData.content().length());

        List<Message> messages = chatPromptBuilder.build(user, relevantData, chronological);

        String aiReply;
        try {
            aiReply = chatClient.prompt(new Prompt(messages))
                    .call()
                    .content();
        } catch (Exception e) {
            log.error("Gemini API error: {}", e.getMessage(), e);
            aiReply = "Xin lỗi, đã có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.";
        }

        ChatMessage assistantMsg = ChatMessage.builder()
                .user(user)
                .role(MessageRole.ASSISTANT)
                .content(aiReply)
                .build();
        chatMessageRepository.save(assistantMsg);

        return ChatMessageResponse.builder()
                .id(assistantMsg.getId())
                .role("ASSISTANT")
                .content(aiReply)
                .createdAt(assistantMsg.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getHistory() {
        UUID userId = currentUserService.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        return chatMessageRepository.findByUserOrderByCreatedAtAsc(user)
                .stream()
                .map(msg -> ChatMessageResponse.builder()
                        .id(msg.getId())
                        .role(msg.getRole().name())
                        .content(msg.getContent())
                        .createdAt(msg.getCreatedAt())
                        .build())
                .toList();
    }

    @Transactional
    public void clearHistory() {
        UUID userId = currentUserService.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        chatMessageRepository.deleteByUser(user);
    }
}
