package com.ttcs.backend.service;

import java.text.Normalizer;
import java.util.EnumSet;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class ChatIntentParser {

    public ChatIntentAnalysis parse(String userMessage) {
        String normalized = normalize(userMessage);
        EnumSet<ChatIntentAnalysis.Type> types = EnumSet.noneOf(ChatIntentAnalysis.Type.class);

        if (containsAny(normalized, "khoa hoc", "course", "lop", "mon", "chuong trinh hoc")) {
            types.add(ChatIntentAnalysis.Type.COURSE);
        }
        if (containsAny(normalized, "dang ky", "enroll", "ghi danh", "da hoc", "dang hoc", "hoc nhung khoa nao")) {
            types.add(ChatIntentAnalysis.Type.ENROLLMENT);
        }
        if (containsAny(normalized, "bai tap", "assignment", "quiz", "han nop", "deadline",
                "chua lam", "can nop", "phai nop", "con bai nao")) {
            types.add(ChatIntentAnalysis.Type.ASSIGNMENT);
        }
        if (containsAny(normalized, "diem", "score", "grade", "ket qua", "cham", "nhan xet",
                "feedback", "bao nhieu diem")) {
            types.add(ChatIntentAnalysis.Type.GRADE);
        }
        if (containsAny(normalized, "tien do", "hoan thanh", "progress", "da xem", "hoc den dau",
                "con bao nhieu", "chua hoan thanh")) {
            types.add(ChatIntentAnalysis.Type.PROGRESS);
        }
        if (containsAny(normalized, "bai hoc", "lesson", "noi dung", "tai lieu", "pdf", "chu de",
                "giai thich", "noi ve", "hoc ve")) {
            types.add(ChatIntentAnalysis.Type.LESSON_CONTENT);
        }
        if (types.isEmpty()) {
            types.add(ChatIntentAnalysis.Type.GENERAL);
        }

        return new ChatIntentAnalysis(types, normalized);
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value.toLowerCase(Locale.ROOT);
        normalized = stripVietnameseDiacritics(normalized);
        String decomposed = Normalizer.normalize(normalized, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String stripVietnameseDiacritics(String value) {
        return value.replaceAll("[àáạảãâầấậẩẫăằắặẳẵ]", "a")
                .replaceAll("[èéẹẻẽêềếệểễ]", "e")
                .replaceAll("[ìíịỉĩ]", "i")
                .replaceAll("[òóọỏõôồốộổỗơờớợởỡ]", "o")
                .replaceAll("[ùúụủũưừứựửữ]", "u")
                .replaceAll("[ỳýỵỷỹ]", "y")
                .replace('đ', 'd');
    }

    private boolean containsAny(String value, String... keywords) {
        for (String keyword : keywords) {
            String normalizedKeyword = normalize(keyword);
            if (value.contains(normalizedKeyword)) {
                return true;
            }
        }
        return false;
    }
}
