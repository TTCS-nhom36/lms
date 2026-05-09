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
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
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
    private final RagService ragService;
    private final ChatClient chatClient;

    public ChatService(
            ChatMessageRepository chatMessageRepository,
            UserRepository userRepository,
            CurrentUserService currentUserService,
            RagService ragService,
            ChatClient.Builder chatClientBuilder) {
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.ragService = ragService;
        this.chatClient = chatClientBuilder.build();
    }

    @Transactional
    public ChatMessageResponse sendMessage(String userMessage) {
        UUID userId = currentUserService.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // Save user message
        ChatMessage userMsg = ChatMessage.builder()
                .user(user)
                .role(MessageRole.USER)
                .content(userMessage)
                .build();
        chatMessageRepository.save(userMsg);

        // Get recent history for context
        List<ChatMessage> recentMessages = chatMessageRepository
                .findByUserOrderByCreatedAtDesc(user, PageRequest.of(0, 20));
        List<ChatMessage> chronological = new ArrayList<>(recentMessages.reversed());

        // RAG: retrieve relevant context from vector store
        String ragContext = ragService.buildContext(userMessage);
        log.info("RAG retrieved {} chars of context", ragContext.length());

        // Build messages for Spring AI
        List<Message> messages = buildMessages(user, ragContext, chronological);

        // Call Gemini via Spring AI ChatClient
        String aiReply;
        try {
            aiReply = chatClient.prompt(new Prompt(messages))
                    .call()
                    .content();
        } catch (Exception e) {
            log.error("Gemini API error: {}", e.getMessage(), e);
            aiReply = "Xin lỗi, đã có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.";
        }

        // Save assistant message
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

    // ───── Build Messages for Spring AI ─────

    private List<Message> buildMessages(User user, String ragContext,
                                         List<ChatMessage> history) {
        List<Message> messages = new ArrayList<>();

        // System prompt with RAG context
        String systemPrompt = buildSystemPrompt(user, ragContext);
        messages.add(new SystemMessage(systemPrompt));

        // Chat history
        for (ChatMessage msg : history) {
            if (msg.getRole() == MessageRole.USER) {
                messages.add(new UserMessage(msg.getContent()));
            } else {
                messages.add(new AssistantMessage(msg.getContent()));
            }
        }

        return messages;
    }

    private String buildSystemPrompt(User user, String ragContext) {
        return """
                Bạn là trợ lý học tập AI của hệ thống LMS (Learning Management System).
                Bạn có quyền truy cập DỮ LIỆU THỰC TẾ từ database, được cung cấp bên dưới thông qua hệ thống RAG (Retrieval Augmented Generation).
                Hãy sử dụng dữ liệu này để trả lời chính xác.
                Nếu thông tin không có trong dữ liệu, hãy nói rõ điều đó.
                Trả lời bằng tiếng Việt nếu người dùng hỏi bằng tiếng Việt.
                Trả lời ngắn gọn, rõ ràng, thân thiện. Dùng markdown khi cần.
                
                ══════ THÔNG TIN NGƯỜI DÙNG ══════
                Tên: %s
                Email: %s
                Vai trò: %s
                
                %s
                """.formatted(
                user.getFullName(),
                user.getEmail(),
                user.getRole().name(),
                ragContext
        );
    }
}
