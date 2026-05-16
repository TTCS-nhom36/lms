package com.ttcs.backend.service.chat;

import java.text.Normalizer;
import java.util.Locale;

public final class ChatTextUtils {

    private ChatTextUtils() {
    }

    public static String normalize(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value.toLowerCase(Locale.ROOT).trim();
        String decomposed = Normalizer.normalize(normalized, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replaceAll("\\s+", " ")
                .trim();
    }

    public static boolean containsAny(String value, String... keywords) {
        for (String keyword : keywords) {
            String normalizedKeyword = normalize(keyword);
            if (value.contains(normalizedKeyword)) {
                return true;
            }
        }
        return false;
    }
}
