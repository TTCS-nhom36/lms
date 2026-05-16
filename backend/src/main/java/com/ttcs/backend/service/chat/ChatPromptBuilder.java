package com.ttcs.backend.service.chat;

import com.ttcs.backend.entity.ChatMessage.MessageRole;
import com.ttcs.backend.entity.User;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

@Service
@Slf4j
public class ChatPromptBuilder {

    private final String systemPromptTemplate;

    public ChatPromptBuilder(@Value("classpath:chat/system-prompt.txt") Resource systemPromptResource) {
        this.systemPromptTemplate = loadSystemPrompt(systemPromptResource);
    }

    public List<Message> build(User user, List<ChatCacheMessage> history) {
        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(buildSystemPrompt(user)));

        for (ChatCacheMessage msg : history) {
            if (msg.getRole() == MessageRole.USER) {
                messages.add(new UserMessage(msg.getContent()));
            } else {
                messages.add(new AssistantMessage(msg.getContent()));
            }
        }

        return messages;
    }

    private String buildSystemPrompt(User user) {
        return systemPromptTemplate.formatted(
                user.getFullName(),
                user.getEmail(),
                user.getRole().name(),
                user.getId());
    }

    private String loadSystemPrompt(Resource resource) {
        try {
            return StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.error("Failed to load chat system prompt resource: {}", e.getMessage(), e);
            throw new IllegalStateException("Cannot load chat system prompt", e);
        }
    }
}
