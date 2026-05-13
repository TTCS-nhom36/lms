package com.ttcs.backend.service.chat;

import com.ttcs.backend.dto.response.ChatMessageResponse;
import com.ttcs.backend.entity.ChatMessage;
import com.ttcs.backend.entity.ChatMessage.MessageRole;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.repository.ChatMessageRepository;
import com.ttcs.backend.repository.UserRepository;
import com.ttcs.backend.service.CurrentUserService;
import com.ttcs.backend.service.chat.model.ChatCacheMessage;
import com.ttcs.backend.service.chat.model.ChatIntentAnalysis;
import com.ttcs.backend.service.chat.model.ChatRelevantData;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
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
    private final ChatHistoryCacheService chatHistoryCacheService;
    private final ChatClient chatClient;

    public ChatService(
            ChatMessageRepository chatMessageRepository,
            UserRepository userRepository,
            CurrentUserService currentUserService,
            ChatIntentParser chatIntentParser,
            ChatBusinessService chatBusinessService,
            ChatPromptBuilder chatPromptBuilder,
            ChatHistoryCacheService chatHistoryCacheService,
            ChatClient.Builder chatClientBuilder) {
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.chatIntentParser = chatIntentParser;
        this.chatBusinessService = chatBusinessService;
        this.chatPromptBuilder = chatPromptBuilder;
        this.chatHistoryCacheService = chatHistoryCacheService;
        this.chatClient = chatClientBuilder.build();
    }

    @Transactional
    public ChatMessageResponse sendMessage(String userMessage) {
        UUID userId = currentUserService.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        List<ChatCacheMessage> chronological = new ArrayList<>(loadContextMessages(userId));

        ChatMessage userMsg = saveMessage(user, MessageRole.USER, userMessage);
        ChatCacheMessage userCache = toCacheMessage(userMsg);
        chatHistoryCacheService.appendMessage(userId, userCache);
        chronological.add(userCache);

        if (isQuizAnswerRequest(userMessage)) {
            String blockedReply = "Xin lỗi, mình không thể trả lời câu hỏi hoặc cung cấp đáp án/giải cho bài quiz. "
                    + "Bạn hãy tự làm bài để đảm bảo công bằng nhé.";
            ChatMessage assistantMsg = saveMessage(user, MessageRole.ASSISTANT, blockedReply);
            chatHistoryCacheService.appendMessage(userId, toCacheMessage(assistantMsg));

            return ChatMessageResponse.builder()
                    .id(assistantMsg.getId())
                    .role("ASSISTANT")
                    .content(blockedReply)
                    .createdAt(assistantMsg.getCreatedAt())
                    .build();
        }

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

        ChatMessage assistantMsg = saveMessage(user, MessageRole.ASSISTANT, aiReply);
        chatHistoryCacheService.appendMessage(userId, toCacheMessage(assistantMsg));

        return ChatMessageResponse.builder()
                .id(assistantMsg.getId())
                .role("ASSISTANT")
                .content(aiReply)
                .createdAt(assistantMsg.getCreatedAt())
                .build();
    }

    private boolean isQuizAnswerRequest(String message) {
        String normalized = normalize(message);
        boolean hasQuizKeyword = containsAny(normalized,
                "quiz", "trac nghiem", "bai tap", "cau hoi", "bai kiem tra", "kiem tra");
        boolean hasAnswerKeyword = containsAny(normalized,
                "dap an", "loi giai", "giai bai", "giai cau", "chon dap an", "phuong an");
        return hasQuizKeyword && hasAnswerKeyword;
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value.toLowerCase(Locale.ROOT);
        String decomposed = Normalizer.normalize(normalized, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replaceAll("\\s+", " ")
                .trim();
    }

    private boolean containsAny(String value, String... keywords) {
        for (String keyword : keywords) {
            String normalizedKeyword = normalize(keyword);
            if (value.contains(normalizedKeyword)) {
                return true;
            }
        }
        return false;
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
        chatHistoryCacheService.clear(user.getId());
    }

    private ChatMessage saveMessage(User user, MessageRole role, String content) {
        ChatMessage msg = ChatMessage.builder()
                .user(user)
                .role(role)
                .content(content)
                .build();
        return chatMessageRepository.save(msg);
    }

    private ChatCacheMessage toCacheMessage(ChatMessage doc) {
        return ChatCacheMessage.builder()
                .role(doc.getRole())
                .content(doc.getContent())
                .createdAt(doc.getCreatedAt())
                .build();
    }

    private List<ChatCacheMessage> loadContextMessages(UUID userId) {
        List<ChatCacheMessage> cached = chatHistoryCacheService.getRecentMessages(userId);
        if (!cached.isEmpty()) {
            return cached;
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        List<ChatMessage> recent = chatMessageRepository
                .findByUserOrderByCreatedAtDesc(user, PageRequest.of(0, 10));
        if (recent.isEmpty()) {
            return List.of();
        }
        List<ChatMessage> chronologicalDocs = new ArrayList<>(recent);
        Collections.reverse(chronologicalDocs);
        List<ChatCacheMessage> chronological = chronologicalDocs
                .stream()
                .map(this::toCacheMessage)
                .toList();
        chatHistoryCacheService.replaceHistory(userId, chronological);
        return chronological;
    }
}
