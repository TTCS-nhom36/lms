package com.ttcs.backend.service.chat.model;

import java.util.Set;

public record ChatIntentAnalysis(Set<Type> types, String normalizedQuestion, boolean listAllRequested) {

    public enum Type {
        COURSE,
        ENROLLMENT,
        ASSIGNMENT,
        GRADE,
        PROGRESS,
        LESSON_CONTENT,
        GENERAL
    }

    public boolean has(Type type) {
        return types.contains(type);
    }
}
