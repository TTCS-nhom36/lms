package com.ttcs.backend.service.chat;

import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import java.time.Duration;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatRateLimitService {

    private static final int MAX_MESSAGES_PER_WINDOW = 20;
    private static final Duration WINDOW = Duration.ofHours(1);
    private static final String KEY_PREFIX = "chat:rate:";

    private final RedisTemplate<String, String> redisTemplate;

    public void checkAllowed(UUID userId) {
        String key = KEY_PREFIX + userId;
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, WINDOW);
            }
            if (count != null && count > MAX_MESSAGES_PER_WINDOW) {
                throw new AppException(ErrorCode.TOO_MANY_REQUESTS,
                        "Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau.");
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Chat rate limit check failed for user {}: {}", userId, e.getMessage());
        }
    }
}
