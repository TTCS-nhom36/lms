package com.ttcs.backend.service.chat;

import com.ttcs.backend.entity.*;
import com.ttcs.backend.enums.EnrollmentStatus;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.repository.*;
import com.ttcs.backend.service.CurrentUserService;
import com.ttcs.backend.utils.ChatTextUtils;
import java.util.List;
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

    private static final int MAX = ChatTextUtils.MAX_PAGE_SIZE;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonRepository lessonRepository;
    private final ChatSemanticSearchService chatSemanticSearchService;

    @Tool(description = "Tìm kiếm nội dung bên trong bài học, tài liệu học tập và file tài liệu theo từ khóa/chủ đề. "
            + "Dùng tool này khi người dùng hỏi về kiến thức, nội dung bài giảng, tài liệu, hoặc muốn tìm đoạn tài liệu liên quan; "
            + "không dùng để liệt kê khóa học, bài tập, điểm số hoặc tiến độ.")
    @Transactional(readOnly = true)
    public String searchLessonContent(
            @ToolParam(description = "Từ khóa/chủ đề cần tìm trong nội dung bài học hoặc tài liệu") String query) {
        User user = user();
        List<Long> courseIds = visibleCourseIds(user);
        log.info("Chat tool start name=searchLessonContent userId={} role={} query='{}' visibleCourseCount={}",
                user.getId(), user.getRole(), query, courseIds.size());
        String result = chatSemanticSearchService.search(user, query, courseIds);
        log.info("Chat tool end name=searchLessonContent userId={} role={} resultChars={}",
                user.getId(), user.getRole(), result.length());
        return result;
    }

    @Tool(description = "Tra cứu thông tin chi tiết của khóa học mà người dùng có quyền xem: mô tả, giảng viên, chương và bài học. "
            + "Dùng khi người dùng hỏi 'khóa học X có gì', 'nội dung khóa học X', 'các bài học trong khóa X'. "
            + "Có thể tìm theo tên/mô tả khóa học và có phân trang. Nếu người dùng không nêu tên khóa học, truyền courseName rỗng. "
            + "page bắt đầu từ 0; nếu thiếu page dùng 0. size tối đa 20; nếu thiếu size dùng 10.")
    @Transactional(readOnly = true)
    public String getCourseDetails(
            @ToolParam(description = "Tên khóa học, một phần tên, hoặc từ khóa trong mô tả; để rỗng nếu muốn xem tất cả khóa học có quyền xem") String courseName,
            @ToolParam(description = "Trang kết quả bắt đầu từ 0; có thể bỏ trống") Integer page,
            @ToolParam(description = "Số khóa học mỗi trang, tối đa 20; có thể bỏ trống") Integer size) {
        User user = user();
        List<Course> courses = visibleCourses(user);
        log.info("Chat tool start name=getCourseDetails userId={} role={} courseName='{}' page={} size={} visibleCourseCount={}",
                user.getId(), user.getRole(), courseName, ChatTextUtils.safePage(page),
                ChatTextUtils.safeSize(size), courses.size());

        List<Course> matched = courses.stream()
                .filter(c -> {
                    String description = c.getDescription() != null ? c.getDescription() : "";
                    return ChatTextUtils.matchesName(c.getTitle(), courseName)
                            || ChatTextUtils.matchesName(description, courseName);
                })
                .toList();

        if (matched.isEmpty()) {
            log.info("Chat tool end name=getCourseDetails userId={} role={} total=0 returned=0",
                    user.getId(), user.getRole());
            return "Khong tim thay khoa hoc '" + courseName + "'.";
        }

        List<Course> pageRows = ChatTextUtils.page(matched, page, size);
        log.info("Chat tool end name=getCourseDetails userId={} role={} total={} returned={} page={} size={}",
                user.getId(), user.getRole(), matched.size(), pageRows.size(),
                ChatTextUtils.safePage(page), ChatTextUtils.safeSize(size));
        StringBuilder sb = ChatTextUtils.pageHeader("Khoa hoc", matched.size(), page, size);
        for (Course c : pageRows) {
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
            case ADMIN -> courseRepository.findAll();
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
