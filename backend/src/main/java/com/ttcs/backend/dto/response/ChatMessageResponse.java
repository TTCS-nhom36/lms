package com.ttcs.backend.dto.response;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class ChatMessageResponse {
    private Long id;
    private String role;
    private String content;
    private LocalDateTime createdAt;
}
