package com.ttcs.backend.utils;

import com.ttcs.backend.entity.Assignment;
import com.ttcs.backend.entity.Course;
import com.ttcs.backend.entity.Submission;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.List;

public final class ChatTextUtils {

    public static final int DEFAULT_PAGE_SIZE = 10;
    public static final int MAX_PAGE_SIZE = 20;
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

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

    public static boolean matchesName(String value, String query) {
        String normalizedQuery = normalize(query);
        if (normalizedQuery.isBlank()) {
            return true;
        }
        return normalize(value).contains(normalizedQuery);
    }

    public static int safePage(int page) {
        return Math.max(page, 0);
    }

    public static int safePage(Integer page) {
        return page == null ? 0 : safePage(page.intValue());
    }

    public static int safeSize(int size) {
        if (size <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    public static int safeSize(Integer size) {
        return size == null ? DEFAULT_PAGE_SIZE : safeSize(size.intValue());
    }

    public static int fromIndex(int page, int size, int total) {
        long from = (long) safePage(page) * safeSize(size);
        return from >= total ? total : (int) from;
    }

    public static int totalPages(int total, int size) {
        int safeSize = safeSize(size);
        if (total == 0) {
            return 0;
        }
        return (int) Math.ceil((double) total / safeSize);
    }

    public static <T> List<T> page(List<T> rows, Integer page, Integer size) {
        int safePage = safePage(page);
        int safeSize = safeSize(size);
        int from = fromIndex(safePage, safeSize, rows.size());
        int to = Math.min(from + safeSize, rows.size());
        return rows.subList(from, to);
    }

    public static StringBuilder pageHeader(String label, int total, Integer page, Integer size) {
        int safePage = safePage(page);
        int safeSize = safeSize(size);
        return new StringBuilder("[" + label + " - page " + safePage + "/" +
                totalPages(total, safeSize) + " - size " + safeSize +
                " - total " + total + "]\n");
    }

    public static String formatDateTime(LocalDateTime value) {
        return value == null ? "-" : value.format(DATE_TIME_FORMATTER);
    }

    public static String truncateBlank(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        return normalized.length() <= 150 ? normalized : normalized.substring(0, 150) + "...";
    }

    public static String submissionScore(Submission submission) {
        if (submission.getFinalScore() != null) {
            return submission.getFinalScore().toString();
        }
        if (submission.getManualScore() != null) {
            return submission.getManualScore().toString();
        }
        if (submission.getAutoScore() != null) {
            return submission.getAutoScore() + "(auto)";
        }
        return "chua cham";
    }

    public static boolean matchesAssignmentOrCourse(Assignment assignment, String name) {
        if (matchesName(assignment.getTitle(), name)) {
            return true;
        }
        Course course = assignment.getCourse();
        return course != null && matchesName(course.getTitle(), name);
    }
}
