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

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatStudentTools {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final int MAX = 20;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final CourseRepository courseRepository;

    @PreAuthorize("hasRole('STUDENT')")
    @Tool(description = "Lấy danh sách các khóa học mà sinh viên đang tham gia.")
    @Transactional(readOnly = true)
    public String getMyEnrolledCourses() {
        User u = user();
        List<Enrollment> rows = enrollmentRepository.findByUserId(u.getId()).stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE).limit(MAX).toList();
        if (rows.isEmpty()) return "Chua dang ky khoa hoc nao.";
        StringBuilder sb = new StringBuilder("[Khoa hoc da dang ky - " + rows.size() + "]\n");
        for (Enrollment e : rows) {
            Course c = e.getCourse();
            sb.append("- ").append(c.getTitle())
              .append(" | GV: ").append(c.getCreatedBy().getFullName())
              .append(" | TT: ").append(c.getStatus()).append("\n");
        }
        return sb.toString();
    }

    @PreAuthorize("hasRole('STUDENT')")
    @Tool(description = "Lấy danh sách bài tập, quiz và hạn nộp của sinh viên.")
    @Transactional(readOnly = true)
    public String getMyAssignments() {
        User u = user();
        List<Long> ids = courseIds(u);
        if (ids.isEmpty()) return "Chua co khoa hoc, khong co bai tap.";
        List<Assignment> rows = assignmentRepository.findByCourseIdIn(ids).stream()
                .sorted(Comparator.comparing(Assignment::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(MAX).toList();
        if (rows.isEmpty()) return "Khong co bai tap nao.";
        StringBuilder sb = new StringBuilder("[Bai tap cua toi - " + rows.size() + "]\n");
        for (Assignment a : rows) {
            sb.append("- ").append(a.getTitle()).append(" | Khoa: ").append(a.getCourse().getTitle())
              .append(" | Loai: ").append(a.getType()).append(" | Han: ").append(fmt(a.getDueDate()))
              .append(" | Max: ").append(a.getMaxScore()).append("\n");
        }
        return sb.toString();
    }

    @PreAuthorize("hasRole('STUDENT')")
    @Tool(description = "Lấy danh sách điểm số và bài nộp của chính sinh viên đó.")
    @Transactional(readOnly = true)
    public String getMyGrades() {
        User u = user();
        List<Submission> rows = submissionRepository.findByUserId(u.getId()).stream()
                .sorted(Comparator.comparing(Submission::getSubmittedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(MAX).toList();
        if (rows.isEmpty()) return "Chua nop bai nao.";
        StringBuilder sb = new StringBuilder("[Diem cua toi - " + rows.size() + "]\n");
        for (Submission s : rows) {
            Assignment a = s.getAssignment();
            sb.append("- ").append(a.getTitle()).append(" | Khoa: ").append(a.getCourse().getTitle())
              .append(" | Diem: ").append(score(s)).append("/").append(a.getMaxScore())
              .append(" | Nop: ").append(fmt(s.getSubmittedAt()))
              .append(" | Nhan xet: ").append(cut(s.getFeedback())).append("\n");
        }
        return sb.toString();
    }

    @PreAuthorize("hasRole('STUDENT')")
    @Tool(description = "Lấy tiến độ học tập của sinh viên trên tất cả các khóa học đang tham gia.")
    @Transactional(readOnly = true)
    public String getMyLearningProgress() {
        User u = user();
        List<LessonProgress> rows = lessonProgressRepository.findByUserId(u.getId()).stream().limit(MAX).toList();
        if (rows.isEmpty()) return "Chua co tien do hoc tap.";
        StringBuilder sb = new StringBuilder("[Tien do cua toi - " + rows.size() + "]\n");
        for (LessonProgress p : rows) {
            Lesson l = p.getLesson();
            sb.append("- ").append(l.getTitle()).append(" | Khoa: ").append(l.getChapter().getCourse().getTitle())
              .append(" | Xong: ").append(Boolean.TRUE.equals(p.getIsCompleted()) ? "co" : "khong")
              .append(" | Xem: ").append(p.getWatchDurationSecs()).append("s\n");
        }
        return sb.toString();
    }

    @PreAuthorize("hasRole('STUDENT')")
    @Tool(description = "Lấy điểm số và bài nộp của chính sinh viên đó cho một khóa học CỤ THỂ theo tên. "
            + "Nhanh hơn rất nhiều so với việc tải toàn bộ điểm. Dùng khi người dùng nhắc đến tên một khóa học cụ thể.")
    @Transactional(readOnly = true)
    public String getMyGradesByCourse(
            @ToolParam(description = "Tên khóa học hoặc từ khóa để tìm kiếm") String courseName) {
        User u = user();
        Course course = findMyCourse(u, courseName);
        if (course == null) return "Ban chua dang ky khoa hoc '" + courseName + "'.";

        List<Submission> rows = submissionRepository.findByUserId(u.getId()).stream()
                .filter(s -> s.getAssignment() != null && s.getAssignment().getCourse() != null &&
                        s.getAssignment().getCourse().getId().equals(course.getId()))
                .sorted(Comparator.comparing(Submission::getSubmittedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(MAX).toList();
        
        if (rows.isEmpty()) return "Khoa '" + course.getTitle() + "' chua co bai nop nao.";

        StringBuilder sb = new StringBuilder("[Diem cua toi - " + course.getTitle() + " - " + rows.size() + " bai]\n");
        for (Submission s : rows) {
            Assignment a = s.getAssignment();
            sb.append("- ").append(a.getTitle())
              .append(" | Diem: ").append(score(s)).append("/").append(a.getMaxScore())
              .append(" | Nop: ").append(fmt(s.getSubmittedAt()))
              .append(" | Nhan xet: ").append(cut(s.getFeedback())).append("\n");
        }
        return sb.toString();
    }

    @PreAuthorize("hasRole('STUDENT')")
    @Tool(description = "Lấy tiến độ học tập của sinh viên cho một khóa học CỤ THỂ theo tên. "
            + "Nhanh hơn rất nhiều so với việc tải toàn bộ tiến độ. Dùng khi người dùng nhắc đến tên một khóa học cụ thể.")
    @Transactional(readOnly = true)
    public String getMyLearningProgressByCourse(
            @ToolParam(description = "Tên khóa học hoặc từ khóa để tìm kiếm") String courseName) {
        User u = user();
        Course course = findMyCourse(u, courseName);
        if (course == null) return "Ban chua dang ky khoa hoc '" + courseName + "'.";

        List<LessonProgress> rows = lessonProgressRepository.findByUserId(u.getId()).stream()
                .filter(p -> p.getLesson() != null && p.getLesson().getChapter() != null &&
                        p.getLesson().getChapter().getCourse() != null &&
                        p.getLesson().getChapter().getCourse().getId().equals(course.getId()))
                .limit(MAX).toList();

        if (rows.isEmpty()) return "Khoa '" + course.getTitle() + "' chua co tien do.";

        StringBuilder sb = new StringBuilder("[Tien do cua toi - " + course.getTitle() + " - " + rows.size() + "]\n");
        for (LessonProgress p : rows) {
            Lesson l = p.getLesson();
            sb.append("- ").append(l.getTitle())
              .append(" | Xong: ").append(Boolean.TRUE.equals(p.getIsCompleted()) ? "co" : "khong")
              .append(" | Xem: ").append(p.getWatchDurationSecs()).append("s\n");
        }
        return sb.toString();
    }

    private User user() {
        return userRepository.findById(currentUserService.getCurrentUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }
    private List<Long> courseIds(User u) {
        return enrollmentRepository.findByUserId(u.getId()).stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
                .map(e -> e.getCourse().getId()).toList();
    }

    private Course findMyCourse(User u, String courseName) {
        String normalized = ChatTextUtils.normalize(courseName);
        return enrollmentRepository.findByUserId(u.getId()).stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
                .map(Enrollment::getCourse)
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
