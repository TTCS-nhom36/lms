package com.ttcs.backend.service.chat;

import com.ttcs.backend.dto.response.ChatMessageResponse;
import com.ttcs.backend.entity.ChatMessage;
import com.ttcs.backend.entity.ChatMessage.MessageRole;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.enums.UserRole;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.repository.ChatMessageRepository;
import com.ttcs.backend.repository.UserRepository;
import com.ttcs.backend.service.CurrentUserService;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class ChatService {

    private static final Duration LLM_TIMEOUT = Duration.ofSeconds(45);
    private static final int MAX_USER_MESSAGE_CHARS = 2_000;
    private static final int MAX_LOG_TEXT_CHARS = 500;

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final ChatPromptBuilder chatPromptBuilder;
    private final ChatHistoryCacheService chatHistoryCacheService;
    private final ChatRateLimitService chatRateLimitService;
    private final ChatClient chatClient;
    private final ChatStudentTools studentTools;
    private final ChatManagementTools managementTools;
    private final ChatCommonTools commonTools;

    public ChatService(
            ChatMessageRepository chatMessageRepository,
            UserRepository userRepository,
            CurrentUserService currentUserService,
            ChatPromptBuilder chatPromptBuilder,
            ChatHistoryCacheService chatHistoryCacheService,
            ChatRateLimitService chatRateLimitService,
            ChatClient.Builder chatClientBuilder,
            ChatStudentTools studentTools,
            ChatManagementTools managementTools,
            ChatCommonTools commonTools) {
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.chatPromptBuilder = chatPromptBuilder;
        this.chatHistoryCacheService = chatHistoryCacheService;
        this.chatRateLimitService = chatRateLimitService;
        this.chatClient = chatClientBuilder.build();
        this.studentTools = studentTools;
        this.managementTools = managementTools;
        this.commonTools = commonTools;
    }

    public ChatMessageResponse sendMessage(String userMessage) {
        long startNanos = System.nanoTime();
        String validatedMessage = validateUserMessage(userMessage);
        UUID userId = currentUserService.getCurrentUserId();
        chatRateLimitService.checkAllowed(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        List<ChatCacheMessage> chronological = new ArrayList<>(loadContextMessages(userId));

        if (isQuizAnswerRequest(validatedMessage)) {
            String blockedReply = "Xin lỗi, mình không thể trả lời câu hỏi hoặc cung cấp đáp án/giải cho bài quiz. "
                    + "Bạn hãy tự làm bài để đảm bảo công bằng nhé.";
            ChatMessage userMsg = saveMessage(user, MessageRole.USER, validatedMessage);
            appendToCache(userId, toCacheMessage(userMsg));
            ChatMessage assistantMsg = saveMessage(user, MessageRole.ASSISTANT, blockedReply);
            appendToCache(userId, toCacheMessage(assistantMsg));
            logChatRequest(userId, "BLOCKED_QUIZ", 0, validatedMessage, blockedReply, startNanos);

            return ChatMessageResponse.builder()
                    .id(assistantMsg.getId())
                    .role("ASSISTANT")
                    .content(blockedReply)
                    .createdAt(assistantMsg.getCreatedAt())
                    .build();
        }

        ChatMessage userMsg = saveMessage(user, MessageRole.USER, validatedMessage);
        ChatCacheMessage userCache = toCacheMessage(userMsg);
        appendToCache(userId, userCache);
        chronological.add(userCache);

        List<Message> messages = chatPromptBuilder.build(user, chronological);
        int promptChars = promptChars(messages);

        String aiReply = callLlmWithTools(messages, user);

        ChatMessage assistantMsg = saveMessage(user, MessageRole.ASSISTANT, aiReply);
        appendToCache(userId, toCacheMessage(assistantMsg));
        logChatRequest(userId, promptChars, validatedMessage, aiReply, startNanos);

        return ChatMessageResponse.builder()
                .id(assistantMsg.getId())
                .role("ASSISTANT")
                .content(aiReply)
                .createdAt(assistantMsg.getCreatedAt())
                .build();
    }

    private String validateUserMessage(String userMessage) {
        if (userMessage == null || userMessage.isBlank()) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Nội dung tin nhắn không được để trống.");
        }
        String trimmed = userMessage.trim();
        if (trimmed.length() > MAX_USER_MESSAGE_CHARS) {
            throw new AppException(ErrorCode.MESSAGE_TOO_LONG,
                    "Tin nhắn không được vượt quá " + MAX_USER_MESSAGE_CHARS + " ký tự.");
        }
        return trimmed;
    }

    private String callLlmWithTools(List<Message> messages, User user) {
        SecurityContext securityContext = SecurityContextHolder.getContext();
        Object[] tools = toolsForRole(user.getRole());
        try {
            return CompletableFuture
                    .supplyAsync(() -> {
                        SecurityContextHolder.setContext(securityContext);
                        try {
                            return chatClient.prompt(new Prompt(messages))
                                    .tools(tools)
                                    .call()
                                    .content();
                        } finally {
                            SecurityContextHolder.clearContext();
                        }
                    })
                    .get(LLM_TIMEOUT.toSeconds(), TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            log.warn("LLM call timed out after {}s", LLM_TIMEOUT.toSeconds());
            return "Yêu cầu mất quá nhiều thời gian. Bạn hãy thử lại nhé.";
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return handleLlmException(e);
        } catch (ExecutionException e) {
            return handleLlmException(e);
        }
    }

    private Object[] toolsForRole(UserRole role) {
        return switch (role) {
            case STUDENT -> new Object[]{studentTools, commonTools};
            case INSTRUCTOR -> new Object[]{managementTools, commonTools};
            case ADMIN -> new Object[]{managementTools, commonTools};
        };
    }

    private String handleLlmException(Exception e) {
        Throwable root = rootCause(e);
        String msg = root.getMessage() != null ? root.getMessage() : "";
        String lowerMsg = msg.toLowerCase();

        if (lowerMsg.contains("429") || lowerMsg.contains("quota") || lowerMsg.contains("rate")) {
            log.warn("LLM rate limit hit: {}", msg);
            return "Hệ thống đang bận, vui lòng thử lại sau ít phút.";
        }
        if (lowerMsg.contains("timeout") || root instanceof TimeoutException) {
            log.warn("LLM timeout: {}", msg);
            return "Yêu cầu mất quá nhiều thời gian. Bạn hãy thử lại nhé.";
        }
        if (lowerMsg.contains("401") || lowerMsg.contains("403") || lowerMsg.contains("auth")) {
            log.error("LLM auth error - check API key config: {}", msg);
            return "Lỗi cấu hình hệ thống. Vui lòng liên hệ admin.";
        }

        log.error("LLM unexpected error: {}", msg, root);
        return "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.";
    }

    private Throwable rootCause(Throwable throwable) {
        Throwable current = throwable;
        while (current.getCause() != null) {
            current = current.getCause();
        }
        return current;
    }

    private void appendToCache(UUID userId, ChatCacheMessage message) {
        chatHistoryCacheService.appendMessage(userId, message);
    }

    private int promptChars(List<Message> messages) {
        return messages.stream()
                .map(Message::getText)
                .filter(text -> text != null)
                .mapToInt(String::length)
                .sum();
    }

    private void logChatRequest(UUID userId, String intentKey, int promptChars,
            String question, String reply, long startNanos) {
        long latencyMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
        log.info("Chat request completed userId={} intent={} promptChars={} replyChars={} "
                        + "latencyMs={} question=\"{}\" reply=\"{}\"",
                userId, intentKey, promptChars,
                reply == null ? 0 : reply.length(), latencyMs,
                forLog(question), forLog(reply));
    }

    private void logChatRequest(UUID userId, int promptChars,
            String question, String reply, long startNanos) {
        logChatRequest(userId, "TOOL_CALLING", promptChars, question, reply, startNanos);
    }

    private String forLog(String value) {
        if (value == null) {
            return "";
        }
        String compact = value.replaceAll("\\s+", " ").trim();
        return compact.length() <= MAX_LOG_TEXT_CHARS
                ? compact
                : compact.substring(0, MAX_LOG_TEXT_CHARS) + "...";
    }

    private boolean isQuizAnswerRequest(String message) {
        String normalized = ChatTextUtils.normalize(message);
        // Best-effort UX guard only. Actual answer secrecy must be enforced by quiz APIs/data access rules.
        boolean hasQuizKeyword = ChatTextUtils.containsAny(normalized,
                "quiz", "trac nghiem", "bai tap", "cau hoi", "cau ", "bai kiem tra", "kiem tra");
        boolean hasAnswerKeyword = ChatTextUtils.containsAny(normalized,
                "dap an", "loi giai", "giai bai", "giai cau", "chon dap an", "chon phuong an",
                "phuong an", "phuong an nao dung", "cau nao dung", "cau nao la dung");
        return hasQuizKeyword && hasAnswerKeyword;
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

    @Transactional
    protected ChatMessage saveMessage(User user, MessageRole role, String content) {
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
