package com.ttcs.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class ChatRequest {
    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    private String message;
}
