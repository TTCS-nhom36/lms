package com.ttcs.backend.event;

public record RagDeleteEvent(Class<?> entityClass, Long entityId) {
}
