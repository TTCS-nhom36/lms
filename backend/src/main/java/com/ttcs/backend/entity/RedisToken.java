package com.ttcs.backend.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;

import java.util.concurrent.TimeUnit;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@RedisHash("redis_tokens")
@Builder
public class RedisToken {
    @Id
    private String jwtId;

    @TimeToLive(unit = TimeUnit.SECONDS)
    private Long expiredTime;
}
