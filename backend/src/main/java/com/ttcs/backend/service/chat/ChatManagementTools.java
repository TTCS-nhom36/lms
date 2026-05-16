package com.ttcs.backend.service.chat;

import com.ttcs.backend.entity.*;
import com.ttcs.backend.enums.EnrollmentStatus;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.repository.*;
import com.ttcs.backend.service.CurrentUserService;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Chat tools for INSTRUCTOR and ADMIN.
 * Includes both overview tools (all managed data) and targeted tools (specific course/student).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ChatManagementTools {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final int MAX = 20;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final LessonProgressRepository lessonProgressRepository;

    // ─── Overview tools (all managed data) ───

    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    @Tool(description = "Lấy danh sách tất cả khóa học mà giảng viên giảng dạy hoặc tất cả khóa học đối với admin. "
            + "Dùng cho các câu hỏi chung chung như 'tôi có những khóa học nào?'. "
            + "Đối với một khóa học CỤ THỂ, hãy dùng getGradesByCourse hoặc getProgressByCourse thay thế.")
    @Transactional(readOnly = true)
    public String getManagedCourses() {
        User u = user();
        List<Course> courses = managedCourses(u);
        if (courses.isEmpty()) return "Khong co khoa hoc nao.";
        StringBuilder sb = new StringBuilder("[Khoa hoc quan ly - " + courses.size() + "]\n");
        for (Course c : courses.stream().limit(MAX).toList()) {
            long studentCount = enrollmentRepository.findByCourseId(c.getId()).stream()
                    .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE).count();
            sb.append("- ID ").append(c.getId()).append(": ").append(c.getTitle())
              .append(" | TT: ").append(c.getStatus())
              .append(" | SV: ").append(studentCount)
              .append(" | GV: ").append(c.getCreatedBy().getFullName()).append("\n");
        }
        return sb.toString();
    }

    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    @Tool(description = "Lấy danh sách tất cả bài tập trong tất cả các khóa học đang quản lý. "
            + "Để lấy bài tập của một khóa học CỤ THỂ, hãy dùng getGradesByCourse thay thế.")
    @Transactional(readOnly = true)
    public String getCourseAssignments() {
        User u = user();
        List<Long> ids = managedCourseIds(u);
        if (ids.isEmpty()) return "Khong co khoa hoc nao.";
        List<Assignment> rows = assignmentRepository.findByCourseIdIn(ids).stream()
                .sorted(Comparator.comparing(Assignment::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(MAX).toList();
        if (rows.isEmpty()) return "Chua co bai tap nao.";
        StringBuilder sb = new StringBuilder("[Bai tap - " + rows.size() + "]\n");
        for (Assignment a : rows) {
            sb.append("- ").append(a.getTitle()).append(" | Khoa: ").append(a.getCourse().getTitle())
              .append(" | Loai: ").append(a.getType()).append(" | Han: ").append(fmt(a.getDueDate()))
              .append(" | Max: ").append(a.getMaxScore()).append("\n");
        }
        return sb.toString();
    }

    // ─── Targeted tools (specific course or student) ───

    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    @Tool(description = "Lấy điểm số và bài nộp của sinh viên cho một khóa học CỤ THỂ theo tên. "
            + "Nhanh hơn rất nhiều so với việc tải toàn bộ điểm. Dùng khi người dùng nhắc đến tên một khóa học cụ thể.")
    @Transactional(readOnly = true)
    public String getGradesByCourse(
            @ToolParam(description = "Tên khóa học hoặc từ khóa để tìm kiếm") String courseName) {
        User u = user();
        Course course = findManagedCourse(u, courseName);
        if (course == null) return "Khong tim thay khoa hoc '" + courseName + "' trong danh sach quan ly.";

        List<Submission> rows = submissionRepository.findByAssignmentCourseIdIn(List.of(course.getId())).stream()
                .sorted(Comparator.comparing(Submission::getSubmittedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(MAX).toList();
        if (rows.isEmpty()) return "Khoa '" + course.getTitle() + "' chua co bai nop nao.";

        StringBuilder sb = new StringBuilder("[Diem - " + course.getTitle() + " - " + rows.size() + " bai]\n");
        for (Submission s : rows) {
            sb.append("- SV: ").append(s.getUser().getFullName())
              .append(" | Bai: ").append(s.getAssignment().getTitle())
              .append(" | Diem: ").append(score(s)).append("/").append(s.getAssignment().getMaxScore())
              .append(" | Nop: ").append(fmt(s.getSubmittedAt()))
              .append(" | Tre: ").append(Boolean.TRUE.equals(s.getIsLate()) ? "co" : "khong")
              .append(" | NX: ").append(cut(s.getFeedback())).append("\n");
        }
        return sb.toString();
    }

    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    @Tool(description = "Lấy tiến độ học tập của sinh viên cho một khóa học CỤ THỂ theo tên. "
            + "Nhanh hơn rất nhiều so với việc tải toàn bộ tiến độ. Dùng khi người dùng nhắc đến tên một khóa học cụ thể.")
    @Transactional(readOnly = true)
    public String getProgressByCourse(
            @ToolParam(description = "Tên khóa học hoặc từ khóa để tìm kiếm") String courseName) {
        User u = user();
        Course course = findManagedCourse(u, courseName);
        if (course == null) return "Khong tim thay khoa hoc '" + courseName + "' trong danh sach quan ly.";

        List<LessonProgress> rows = lessonProgressRepository.findByLessonChapterCourseIdIn(List.of(course.getId())).stream()
                .limit(MAX).toList();
        if (rows.isEmpty()) return "Khoa '" + course.getTitle() + "' chua co tien do.";

        StringBuilder sb = new StringBuilder("[Tien do - " + course.getTitle() + " - " + rows.size() + "]\n");
        for (LessonProgress p : rows) {
            sb.append("- SV: ").append(p.getUser().getFullName())
              .append(" | Bai: ").append(p.getLesson().getTitle())
              .append(" | Xong: ").append(Boolean.TRUE.equals(p.getIsCompleted()) ? "co" : "khong")
              .append(" | Xem: ").append(p.getWatchDurationSecs()).append("s\n");
        }
        return sb.toString();
    }

    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    @Tool(description = "Lấy toàn bộ điểm số và tiến độ học tập của một sinh viên CỤ THỂ theo tên. "
            + "Dùng khi người dùng hỏi về kết quả học tập của một sinh viên cụ thể.")
    @Transactional(readOnly = true)
    public String getStudentInfo(
            @ToolParam(description = "Tên sinh viên hoặc từ khóa để tìm kiếm") String studentName) {
        User u = user();
        List<Long> courseIds = managedCourseIds(u);
        if (courseIds.isEmpty()) return "Khong co khoa hoc nao.";

        // Find student by name
        String normalized = ChatTextUtils.normalize(studentName);
        List<User> students = enrollmentRepository.findAll().stream()
                .filter(e -> courseIds.contains(e.getCourse().getId()))
                .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
                .map(Enrollment::getUser)
                .distinct()
                .filter(s -> ChatTextUtils.normalize(s.getFullName()).contains(normalized))
                .limit(3)
                .toList();

        if (students.isEmpty()) return "Khong tim thay sinh vien '" + studentName + "'.";

        StringBuilder sb = new StringBuilder();
        for (User student : students) {
            sb.append("[SV: ").append(student.getFullName()).append(" - ").append(student.getEmail()).append("]\n");

            // Grades
            List<Submission> subs = submissionRepository.findByUserId(student.getId()).stream()
                    .filter(s -> s.getAssignment() != null && s.getAssignment().getCourse() != null
                            && courseIds.contains(s.getAssignment().getCourse().getId()))
                    .sorted(Comparator.comparing(Submission::getSubmittedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    .limit(10)
                    .toList();
            if (!subs.isEmpty()) {
                sb.append("Diem (").append(subs.size()).append("):\n");
                for (Submission s : subs) {
                    sb.append("  - ").append(s.getAssignment().getTitle())
                      .append(" | ").append(score(s)).append("/").append(s.getAssignment().getMaxScore())
                      .append(" | ").append(fmt(s.getSubmittedAt())).append("\n");
                }
            }

            // Progress
            List<LessonProgress> progress = lessonProgressRepository.findByUserId(student.getId()).stream()
                    .filter(p -> p.getLesson() != null && p.getLesson().getChapter() != null
                            && p.getLesson().getChapter().getCourse() != null
                            && courseIds.contains(p.getLesson().getChapter().getCourse().getId()))
                    .limit(10)
                    .toList();
            long completed = progress.stream().filter(p -> Boolean.TRUE.equals(p.getIsCompleted())).count();
            sb.append("Tien do: ").append(completed).append("/").append(progress.size()).append(" bai hoc da xong\n\n");
        }
        return sb.toString();
    }

    // ─── Helpers ───

    private User user() {
        return userRepository.findById(currentUserService.getCurrentUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private List<Course> managedCourses(User u) {
        if (currentUserService.hasRole("ADMIN")) return courseRepository.findAll().stream().limit(MAX).toList();
        return courseRepository.findByCreatedById(u.getId());
    }

    private List<Long> managedCourseIds(User u) {
        return managedCourses(u).stream().map(Course::getId).toList();
    }

    /** Find a specific course by name within the user's managed courses */
    private Course findManagedCourse(User u, String courseName) {
        String normalized = ChatTextUtils.normalize(courseName);
        return managedCourses(u).stream()
                .filter(c -> {
                    String title = ChatTextUtils.normalize(c.getTitle());
                    return title.contains(normalized) || normalized.contains(title);
                })
                .findFirst()
                .orElse(null);
    }

    private String fmt(java.time.LocalDateTime v) { return v == null ? "-" : v.format(FMT); }

    private String cut(String v) {
        if (v == null || v.isBlank()) return "-";
        String n = v.replaceAll("\\s+", " ").trim();
        return n.length() <= 150 ? n : n.substring(0, 150) + "...";
    }

    private String score(Submission s) {
        if (s.getFinalScore() != null) return s.getFinalScore().toString();
        if (s.getManualScore() != null) return s.getManualScore().toString();
        if (s.getAutoScore() != null) return s.getAutoScore() + "(auto)";
        return "chua cham";
    }
}
