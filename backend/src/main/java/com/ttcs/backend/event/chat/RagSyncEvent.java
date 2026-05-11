package com.ttcs.backend.event.chat;

public record RagSyncEvent(Class<?> entityClass, Long entityId) {
}
