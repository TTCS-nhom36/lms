package com.ttcs.backend.service.chat;

import com.ttcs.backend.entity.*;
import com.ttcs.backend.enums.EnrollmentStatus;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.repository.*;
import com.ttcs.backend.service.CurrentUserService;
import com.ttcs.backend.utils.ChatTextUtils;
import java.util.Comparator;
import java.util.List;
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

    private static final int MAX = ChatTextUtils.MAX_PAGE_SIZE;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final LessonProgressRepository lessonProgressRepository;

    @PreAuthorize("hasRole('STUDENT')")
    @Tool(description = "Liệt kê hoặc tìm các khóa học mà sinh viên hiện đang tham gia. "
            + "Dùng khi sinh viên hỏi 'tôi đang học khóa nào', 'khóa học của tôi', hoặc tìm khóa học theo tên. "
            + "Chỉ trả về khóa học đã đăng ký và đang ACTIVE. Nếu không có từ khóa, truyền name rỗng. "
            + "page bắt đầu từ 0; nếu thiếu page dùng 0. size tối đa 20; nếu thiếu size dùng 10.")
    @Transactional(readOnly = true)
    public String getMyEnrolledCourses(
            @ToolParam(description = "Tên khóa học hoặc một phần tên khóa học; để rỗng nếu muốn lấy tất cả") String name,
            @ToolParam(description = "Trang kết quả bắt đầu từ 0; có thể bỏ trống") Integer page,
            @ToolParam(description = "Số dòng mỗi trang, tối đa 20; có thể bỏ trống") Integer size) {
        User u = user();
        logToolStart("getMyEnrolledCourses", u, name, page, size);
        List<Enrollment> rows = enrollmentRepository.findByUserId(u.getId()).stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
                .filter(e -> ChatTextUtils.matchesName(e.getCourse().getTitle(), name))
                .toList();
        if (rows.isEmpty()) {
            logToolEnd("getMyEnrolledCourses", u, 0, 0, page, size);
            return "Khong tim thay khoa hoc phu hop.";
        }
        List<Enrollment> pageRows = ChatTextUtils.page(rows, page, size);
        logToolEnd("getMyEnrolledCourses", u, rows.size(), pageRows.size(), page, size);
        StringBuilder sb = ChatTextUtils.pageHeader("Khoa hoc da dang ky", rows.size(), page, size);
        for (Enrollment e : pageRows) {
            Course c = e.getCourse();
            sb.append("- ").append(c.getTitle())
              .append(" | GV: ").append(c.getCreatedBy().getFullName())
              .append(" | TT: ").append(c.getStatus()).append("\n");
        }
        return sb.toString();
    }

    @PreAuthorize("hasRole('STUDENT')")
    @Tool(description = "Liệt kê hoặc tìm bài tập/quiz của sinh viên trong các khóa học đã đăng ký. "
            + "Dùng khi sinh viên hỏi bài tập, quiz, hạn nộp, hoặc bài tập của một khóa học cụ thể. "
            + "Tham số name có thể là tên bài tập/quiz hoặc tên khóa học. Nếu không có từ khóa, truyền name rỗng. "
            + "page bắt đầu từ 0; nếu thiếu page dùng 0. size tối đa 20; nếu thiếu size dùng 10.")
    @Transactional(readOnly = true)
    public String getMyAssignments(
            @ToolParam(description = "Tên bài tập/quiz, một phần tên bài tập/quiz, hoặc tên khóa học; để rỗng nếu muốn lấy tất cả") String name,
            @ToolParam(description = "Trang kết quả bắt đầu từ 0; có thể bỏ trống") Integer page,
            @ToolParam(description = "Số dòng mỗi trang, tối đa 20; có thể bỏ trống") Integer size) {
        User u = user();
        logToolStart("getMyAssignments", u, name, page, size);
        List<Long> ids = courseIds(u);
        if (ids.isEmpty()) {
            logToolEnd("getMyAssignments", u, 0, 0, page, size);
            return "Chua co khoa hoc, khong co bai tap.";
        }
        List<Assignment> assignments = assignmentRepository.findByCourseIdIn(ids);
        List<Assignment> rows = assignments.stream()
                .filter(a -> ChatTextUtils.matchesAssignmentOrCourse(a, name))
                .sorted(Comparator.comparing(Assignment::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        log.info("Chat tool query name=getMyAssignments userId={} role={} enrolledCourseCount={} rawAssignments={} matchedAssignments={}",
                u.getId(), u.getRole(), ids.size(), assignments.size(), rows.size());
        if (rows.isEmpty()) {
            logToolEnd("getMyAssignments", u, 0, 0, page, size);
            return "Khong tim thay bai tap phu hop.";
        }
        List<Assignment> pageRows = ChatTextUtils.page(rows, page, size);
        logToolEnd("getMyAssignments", u, rows.size(), pageRows.size(), page, size);
        StringBuilder sb = ChatTextUtils.pageHeader("Bai tap cua toi", rows.size(), page, size);
        for (Assignment a : pageRows) {
            sb.append("- ").append(a.getTitle()).append(" | Khoa: ").append(a.getCourse().getTitle())
              .append(" | Loai: ").append(a.getType()).append(" | Han: ").append(ChatTextUtils.formatDateTime(a.getDueDate()))
              .append(" | Max: ").append(a.getMaxScore()).append("\n");
        }
        return sb.toString();
    }

    @PreAuthorize("hasRole('STUDENT')")
    @Tool(description = "Liệt kê hoặc tìm điểm số/bài nộp của chính sinh viên theo tên bài tập/quiz. "
            + "Dùng khi sinh viên hỏi điểm của tôi, bài đã nộp, nhận xét bài nộp, hoặc điểm của một bài cụ thể. "
            + "Nếu người dùng hỏi điểm trong một khóa học cụ thể, ưu tiên dùng getMyGradesByCourse. "
            + "Nếu không có tên bài tập, truyền name rỗng. page bắt đầu từ 0; nếu thiếu page dùng 0. size tối đa 20; nếu thiếu size dùng 10.")
    @Transactional(readOnly = true)
    public String getMyGrades(
            @ToolParam(description = "Tên bài tập/quiz hoặc một phần tên bài tập/quiz; để rỗng nếu muốn lấy tất cả") String name,
            @ToolParam(description = "Trang kết quả bắt đầu từ 0; có thể bỏ trống") Integer page,
            @ToolParam(description = "Số dòng mỗi trang, tối đa 20; có thể bỏ trống") Integer size) {
        User u = user();
        logToolStart("getMyGrades", u, name, page, size);
        List<Submission> rows = submissionRepository.findByUserId(u.getId()).stream()
                .filter(s -> s.getAssignment() != null && ChatTextUtils.matchesName(s.getAssignment().getTitle(), name))
                .sorted(Comparator.comparing(Submission::getSubmittedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        if (rows.isEmpty()) {
            logToolEnd("getMyGrades", u, 0, 0, page, size);
            return "Khong tim thay bai nop phu hop.";
        }
        List<Submission> pageRows = ChatTextUtils.page(rows, page, size);
        logToolEnd("getMyGrades", u, rows.size(), pageRows.size(), page, size);
        StringBuilder sb = ChatTextUtils.pageHeader("Diem cua toi", rows.size(), page, size);
        for (Submission s : pageRows) {
            Assignment a = s.getAssignment();
            sb.append("- ").append(a.getTitle()).append(" | Khoa: ").append(a.getCourse().getTitle())
              .append(" | Diem: ").append(ChatTextUtils.submissionScore(s)).append("/").append(a.getMaxScore())
              .append(" | Nop: ").append(ChatTextUtils.formatDateTime(s.getSubmittedAt()))
              .append(" | Nhan xet: ").append(ChatTextUtils.truncateBlank(s.getFeedback())).append("\n");
        }
        return sb.toString();
    }

    @PreAuthorize("hasRole('STUDENT')")
    @Tool(description = "Liệt kê hoặc tìm tiến độ học tập của sinh viên theo tên bài học. "
            + "Dùng khi sinh viên hỏi tiến độ học, bài nào đã hoàn thành, thời lượng xem bài học. "
            + "Nếu người dùng hỏi tiến độ của một khóa học cụ thể, ưu tiên dùng getMyLearningProgressByCourse. "
            + "Nếu không có tên bài học, truyền name rỗng. page bắt đầu từ 0; nếu thiếu page dùng 0. size tối đa 20; nếu thiếu size dùng 10.")
    @Transactional(readOnly = true)
    public String getMyLearningProgress(
            @ToolParam(description = "Tên bài học hoặc một phần tên bài học; để rỗng nếu muốn lấy tất cả") String name,
            @ToolParam(description = "Trang kết quả bắt đầu từ 0; có thể bỏ trống") Integer page,
            @ToolParam(description = "Số dòng mỗi trang, tối đa 20; có thể bỏ trống") Integer size) {
        User u = user();
        logToolStart("getMyLearningProgress", u, name, page, size);
        List<LessonProgress> rows = lessonProgressRepository.findByUserId(u.getId()).stream()
                .filter(p -> p.getLesson() != null && ChatTextUtils.matchesName(p.getLesson().getTitle(), name))
                .toList();
        if (rows.isEmpty()) {
            logToolEnd("getMyLearningProgress", u, 0, 0, page, size);
            return "Khong tim thay tien do phu hop.";
        }
        List<LessonProgress> pageRows = ChatTextUtils.page(rows, page, size);
        logToolEnd("getMyLearningProgress", u, rows.size(), pageRows.size(), page, size);
        StringBuilder sb = ChatTextUtils.pageHeader("Tien do cua toi", rows.size(), page, size);
        for (LessonProgress p : pageRows) {
            Lesson l = p.getLesson();
            sb.append("- ").append(l.getTitle()).append(" | Khoa: ").append(l.getChapter().getCourse().getTitle())
              .append(" | Xong: ").append(Boolean.TRUE.equals(p.getIsCompleted()) ? "co" : "khong")
              .append(" | Xem: ").append(p.getWatchDurationSecs()).append("s\n");
        }
        return sb.toString();
    }

    @PreAuthorize("hasRole('STUDENT')")
    @Tool(description = "Lấy điểm số và bài nộp của chính sinh viên trong một khóa học cụ thể. "
            + "Dùng khi sinh viên hỏi điểm/bài nộp/nhận xét và có nêu tên khóa học. "
            + "Không dùng để liệt kê assignment chưa nộp; dùng getMyAssignments cho danh sách bài tập/quiz.")
    @Transactional(readOnly = true)
    public String getMyGradesByCourse(
            @ToolParam(description = "Tên khóa học hoặc một phần tên khóa học cần xem điểm") String courseName) {
        User u = user();
        log.info("Chat tool start name=getMyGradesByCourse userId={} role={} courseName='{}'",
                u.getId(), u.getRole(), courseName);
        Course course = findMyCourse(u, courseName);
        if (course == null) {
            log.info("Chat tool end name=getMyGradesByCourse userId={} role={} courseFound=false returned=0",
                    u.getId(), u.getRole());
            return "Ban chua dang ky khoa hoc '" + courseName + "'.";
        }

        List<Submission> rows = submissionRepository.findByUserId(u.getId()).stream()
                .filter(s -> s.getAssignment() != null && s.getAssignment().getCourse() != null &&
                        s.getAssignment().getCourse().getId().equals(course.getId()))
                .sorted(Comparator.comparing(Submission::getSubmittedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(MAX).toList();
        
        if (rows.isEmpty()) {
            log.info("Chat tool end name=getMyGradesByCourse userId={} role={} courseId={} returned=0",
                    u.getId(), u.getRole(), course.getId());
            return "Khoa '" + course.getTitle() + "' chua co bai nop nao.";
        }
        log.info("Chat tool end name=getMyGradesByCourse userId={} role={} courseId={} returned={}",
                u.getId(), u.getRole(), course.getId(), rows.size());

        StringBuilder sb = new StringBuilder("[Diem cua toi - " + course.getTitle() + " - " + rows.size() + " bai]\n");
        for (Submission s : rows) {
            Assignment a = s.getAssignment();
            sb.append("- ").append(a.getTitle())
              .append(" | Diem: ").append(ChatTextUtils.submissionScore(s)).append("/").append(a.getMaxScore())
              .append(" | Nop: ").append(ChatTextUtils.formatDateTime(s.getSubmittedAt()))
              .append(" | Nhan xet: ").append(ChatTextUtils.truncateBlank(s.getFeedback())).append("\n");
        }
        return sb.toString();
    }

    @PreAuthorize("hasRole('STUDENT')")
    @Tool(description = "Lấy tiến độ học tập của chính sinh viên trong một khóa học cụ thể. "
            + "Dùng khi sinh viên hỏi tiến độ, bài đã hoàn thành, thời lượng xem và có nêu tên khóa học.")
    @Transactional(readOnly = true)
    public String getMyLearningProgressByCourse(
            @ToolParam(description = "Tên khóa học hoặc một phần tên khóa học cần xem tiến độ") String courseName) {
        User u = user();
        log.info("Chat tool start name=getMyLearningProgressByCourse userId={} role={} courseName='{}'",
                u.getId(), u.getRole(), courseName);
        Course course = findMyCourse(u, courseName);
        if (course == null) {
            log.info("Chat tool end name=getMyLearningProgressByCourse userId={} role={} courseFound=false returned=0",
                    u.getId(), u.getRole());
            return "Ban chua dang ky khoa hoc '" + courseName + "'.";
        }

        List<LessonProgress> rows = lessonProgressRepository.findByUserId(u.getId()).stream()
                .filter(p -> p.getLesson() != null && p.getLesson().getChapter() != null &&
                        p.getLesson().getChapter().getCourse() != null &&
                        p.getLesson().getChapter().getCourse().getId().equals(course.getId()))
                .limit(MAX).toList();

        if (rows.isEmpty()) {
            log.info("Chat tool end name=getMyLearningProgressByCourse userId={} role={} courseId={} returned=0",
                    u.getId(), u.getRole(), course.getId());
            return "Khoa '" + course.getTitle() + "' chua co tien do.";
        }
        log.info("Chat tool end name=getMyLearningProgressByCourse userId={} role={} courseId={} returned={}",
                u.getId(), u.getRole(), course.getId(), rows.size());

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

    private void logToolStart(String toolName, User user, String name, Integer page, Integer size) {
        log.info("Chat tool start name={} userId={} role={} query='{}' page={} size={}",
                toolName, user.getId(), user.getRole(), name,
                ChatTextUtils.safePage(page), ChatTextUtils.safeSize(size));
    }

    private void logToolEnd(String toolName, User user, int total, int returned, Integer page, Integer size) {
        log.info("Chat tool end name={} userId={} role={} total={} returned={} page={} size={}",
                toolName, user.getId(), user.getRole(), total, returned,
                ChatTextUtils.safePage(page), ChatTextUtils.safeSize(size));
    }
}
