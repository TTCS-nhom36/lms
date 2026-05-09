package com.ttcs.backend.event;

public record RagSyncEvent(Class<?> entityClass, Long entityId) {
}
