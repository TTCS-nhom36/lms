package com.ttcs.backend.service.chat;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class ChatHistoryCacheService {

    private static final int MAX_CONTEXT_MESSAGES = 10;
    private static final String KEY_PREFIX = "chat:recent:";

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    public ChatHistoryCacheService(RedisTemplate<String, String> redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public void appendMessage(UUID userId, ChatCacheMessage message) {
        String key = buildKey(userId);
        ListOperations<String, String> ops = redisTemplate.opsForList();
        try {
            String payload = objectMapper.writeValueAsString(message);
            ops.rightPush(key, payload);
            ops.trim(key, -MAX_CONTEXT_MESSAGES, -1);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize chat cache message", e);
        }
    }

    public List<ChatCacheMessage> getRecentMessages(UUID userId) {
        String key = buildKey(userId);
        ListOperations<String, String> ops = redisTemplate.opsForList();
        List<String> raw = ops.range(key, 0, -1);
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        List<ChatCacheMessage> result = new ArrayList<>();
        for (String item : raw) {
            try {
                result.add(objectMapper.readValue(item, ChatCacheMessage.class));
            } catch (JsonProcessingException e) {
                log.warn("Failed to deserialize chat cache message", e);
            }
        }
        return result;
    }

    public void replaceHistory(UUID userId, List<ChatCacheMessage> messages) {
        String key = buildKey(userId);
        redisTemplate.delete(key);
        if (messages == null || messages.isEmpty()) {
            return;
        }
        ListOperations<String, String> ops = redisTemplate.opsForList();
        for (ChatCacheMessage message : messages) {
            try {
                String payload = objectMapper.writeValueAsString(message);
                ops.rightPush(key, payload);
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize chat cache message", e);
            }
        }
        ops.trim(key, -MAX_CONTEXT_MESSAGES, -1);
    }

    public void clear(UUID userId) {
        redisTemplate.delete(buildKey(userId));
    }

    private String buildKey(UUID userId) {
        return KEY_PREFIX + userId;
    }
}
