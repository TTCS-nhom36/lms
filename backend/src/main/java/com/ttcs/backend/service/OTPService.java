package com.ttcs.backend.service;

import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class OTPService {
    private final StringRedisTemplate stringRedisTemplate;

    public String generateOTP(String email) {
        String key = "otp:limit:" + email;

        Long count = stringRedisTemplate.opsForValue().increment(key);

        if (count == 1) {
            stringRedisTemplate.expire(key, Duration.ofMinutes(1));
        }

        if (count > 3) {
            throw new AppException(ErrorCode.TOO_MANY_REQUESTS, "Too many requests");
        }
        return String.valueOf((int)((Math.random() * 900000)+100000));
    }

    public void saveOTP(String email, String otp) {
        stringRedisTemplate.opsForValue().set(email, otp);
    }

    public boolean checkOTP(String email, String otp) {
        return stringRedisTemplate.opsForValue().get(email).equals(otp);
    }

    public void deleteOTP(String email, String otp) {
        stringRedisTemplate.delete(email);
    }
}
