package com.ttcs.backend.service.chat;

import com.ttcs.backend.entity.ChatMessage.MessageRole;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatCacheMessage {
    private MessageRole role;
    private String content;
    private LocalDateTime createdAt;
}
