package com.ttcs.backend.service.chat;

import com.ttcs.backend.entity.*;
import com.ttcs.backend.enums.EnrollmentStatus;
import com.ttcs.backend.enums.UserRole;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.repository.*;
import com.ttcs.backend.service.CurrentUserService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Chat tools available to ALL roles.
 * Data is automatically scoped based on the current user's role.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ChatCommonTools {

    private static final int MAX = 20;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonRepository lessonRepository;
    private final ChatSemanticSearchService chatSemanticSearchService;

    @Tool(description = "Tìm kiếm nội dung bài học, tài liệu học tập, và file tài liệu theo chủ đề hoặc từ khóa.")
    @Transactional(readOnly = true)
    public String searchLessonContent(
            @ToolParam(description = "Từ khóa tìm kiếm hoặc chủ đề") String query) {
        User user = user();
        List<Long> courseIds = visibleCourseIds(user);
        log.info("Tool searchLessonContent userId={} role={} query='{}'", user.getId(), user.getRole(), query);
        return chatSemanticSearchService.search(user, query, courseIds);
    }

    @Tool(description = "Lấy thông tin chi tiết về một khóa học cụ thể bao gồm các chương và bài học.")
    @Transactional(readOnly = true)
    public String getCourseDetails(
            @ToolParam(description = "Tên khóa học hoặc từ khóa tìm kiếm") String courseName) {
        User user = user();
        List<Course> courses = visibleCourses(user);
        log.info("Tool getCourseDetails userId={} role={} courseName='{}'", user.getId(), user.getRole(), courseName);

        String normalized = ChatTextUtils.normalize(courseName);
        List<Course> matched = courses.stream()
                .filter(c -> {
                    String t = ChatTextUtils.normalize(c.getTitle());
                    String d = ChatTextUtils.normalize(c.getDescription() != null ? c.getDescription() : "");
                    return t.contains(normalized) || d.contains(normalized);
                })
                .limit(3).toList();

        if (matched.isEmpty())
            return "Khong tim thay khoa hoc '" + courseName + "'.";

        StringBuilder sb = new StringBuilder();
        for (Course c : matched) {
            sb.append("[Khoa: ").append(c.getTitle()).append("]\n");
            sb.append("Mo ta: ").append(c.getDescription() != null ? c.getDescription() : "-").append("\n");
            sb.append("GV: ").append(c.getCreatedBy().getFullName()).append(" | TT: ").append(c.getStatus())
                    .append("\n");
            List<Lesson> lessons = lessonRepository.findByChapterCourseIdIn(List.of(c.getId()));
            if (!lessons.isEmpty()) {
                sb.append("Bai hoc (").append(lessons.size()).append("):\n");
                for (Lesson l : lessons.stream().limit(MAX).toList()) {
                    sb.append("  - ").append(l.getTitle())
                            .append(" | Chuong: ").append(l.getChapter().getTitle())
                            .append(" | Loai: ").append(l.getContentType()).append("\n");
                }
            }
            sb.append("\n");
        }
        return sb.toString();
    }

    // ─── Helpers ───
    private User user() {
        return userRepository.findById(currentUserService.getCurrentUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private List<Course> visibleCourses(User u) {
        return switch (u.getRole()) {
            case ADMIN -> courseRepository.findAll().stream().limit(MAX).toList();
            case INSTRUCTOR -> courseRepository.findByCreatedById(u.getId());
            case STUDENT -> enrollmentRepository.findByUserId(u.getId()).stream()
                    .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
                    .map(Enrollment::getCourse).toList();
        };
    }

    private List<Long> visibleCourseIds(User u) {
        return visibleCourses(u).stream().map(Course::getId).toList();
    }
}
