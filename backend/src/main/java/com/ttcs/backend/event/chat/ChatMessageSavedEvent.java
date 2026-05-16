package com.ttcs.backend.event.chat;

import com.ttcs.backend.service.chat.ChatCacheMessage;
import java.util.UUID;

public record ChatMessageSavedEvent(UUID userId, ChatCacheMessage message) {
}
