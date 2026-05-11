package com.ttcs.backend.event.chat;

public record RagDeleteEvent(Class<?> entityClass, Long entityId) {
}
