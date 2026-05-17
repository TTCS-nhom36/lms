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

/**
 * Chat tools for INSTRUCTOR and ADMIN.
 * Includes both overview tools (all managed data) and targeted tools (specific course/student).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ChatManagementTools {

    private static final int MAX = ChatTextUtils.MAX_PAGE_SIZE;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final LessonProgressRepository lessonProgressRepository;

    // ─── Overview tools (all managed data) ───

    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    @Tool(description = "Liệt kê hoặc tìm các khóa học mà instructor đang quản lý; admin thấy tất cả khóa học. "
            + "Dùng khi người dùng hỏi 'tôi quản lý khóa nào', 'danh sách khóa học', hoặc tìm khóa học theo tên. "
            + "Không dùng để lấy bài tập, điểm số hoặc tiến độ của khóa học; dùng tool chuyên biệt tương ứng. "
            + "Nếu không có từ khóa, truyền name rỗng. page bắt đầu từ 0; nếu thiếu page dùng 0. size tối đa 20; nếu thiếu size dùng 10.")
    @Transactional(readOnly = true)
    public String getManagedCourses(
            @ToolParam(description = "Tên khóa học hoặc một phần tên khóa học; để rỗng nếu muốn lấy tất cả khóa học trong phạm vi quản lý") String name,
            @ToolParam(description = "Trang kết quả bắt đầu từ 0; có thể bỏ trống") Integer page,
            @ToolParam(description = "Số dòng mỗi trang, tối đa 20; có thể bỏ trống") Integer size) {
        User u = user();
        logToolStart("getManagedCourses", u, name, page, size);
        List<Course> courses = managedCourses(u).stream()
                .filter(c -> ChatTextUtils.matchesName(c.getTitle(), name))
                .toList();
        if (courses.isEmpty()) {
            logToolEnd("getManagedCourses", u, 0, 0, page, size);
            return "Khong co khoa hoc nao.";
        }
        List<Course> pageRows = ChatTextUtils.page(courses, page, size);
        logToolEnd("getManagedCourses", u, courses.size(), pageRows.size(), page, size);
        StringBuilder sb = ChatTextUtils.pageHeader("Khoa hoc quan ly", courses.size(), page, size);
        for (Course c : pageRows) {
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
    @Tool(description = "Liệt kê hoặc tìm bài tập/quiz trong các khóa học mà instructor/admin quản lý. "
            + "Dùng khi người dùng hỏi danh sách bài tập, quiz, hạn nộp, bài tập của khóa học X, hoặc bài tập có tên X. "
            + "Tham số name có thể là tên bài tập/quiz hoặc tên khóa học. Nếu không có từ khóa, truyền name rỗng. "
            + "Tool này chỉ trả thông tin bài tập/hạn nộp, không trả điểm bài nộp; dùng getGradesByCourse để xem điểm/bài nộp. "
            + "page bắt đầu từ 0; nếu thiếu page dùng 0. size tối đa 20; nếu thiếu size dùng 10.")
    @Transactional(readOnly = true)
    public String getCourseAssignments(
            @ToolParam(description = "Tên bài tập/quiz, một phần tên bài tập/quiz, hoặc tên khóa học; để rỗng nếu muốn lấy tất cả") String name,
            @ToolParam(description = "Trang kết quả bắt đầu từ 0; có thể bỏ trống") Integer page,
            @ToolParam(description = "Số dòng mỗi trang, tối đa 20; có thể bỏ trống") Integer size) {
        User u = user();
        logToolStart("getCourseAssignments", u, name, page, size);
        List<Long> ids = managedCourseIds(u);
        if (ids.isEmpty()) {
            logToolEnd("getCourseAssignments", u, 0, 0, page, size);
            return "Khong co khoa hoc nao.";
        }
        List<Assignment> assignments = assignmentRepository.findByCourseIdIn(ids);
        List<Assignment> rows = assignments.stream()
                .filter(a -> ChatTextUtils.matchesAssignmentOrCourse(a, name))
                .sorted(Comparator.comparing(Assignment::getDueDate, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        log.info("Chat tool query name=getCourseAssignments userId={} role={} managedCourseCount={} rawAssignments={} matchedAssignments={}",
                u.getId(), u.getRole(), ids.size(), assignments.size(), rows.size());
        if (rows.isEmpty()) {
            logToolEnd("getCourseAssignments", u, 0, 0, page, size);
            return "Khong tim thay bai tap phu hop.";
        }
        List<Assignment> pageRows = ChatTextUtils.page(rows, page, size);
        logToolEnd("getCourseAssignments", u, rows.size(), pageRows.size(), page, size);
        StringBuilder sb = ChatTextUtils.pageHeader("Bai tap", rows.size(), page, size);
        for (Assignment a : pageRows) {
            sb.append("- ").append(a.getTitle()).append(" | Khoa: ").append(a.getCourse().getTitle())
              .append(" | Loai: ").append(a.getType()).append(" | Han: ").append(ChatTextUtils.formatDateTime(a.getDueDate()))
              .append(" | Max: ").append(a.getMaxScore()).append("\n");
        }
        return sb.toString();
    }

    // ─── Targeted tools (specific course or student) ───

    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    @Tool(description = "Lấy điểm số và bài nộp của sinh viên trong một khóa học cụ thể mà instructor/admin quản lý. "
            + "Dùng khi người dùng hỏi điểm, bài nộp, trạng thái nộp muộn, feedback/nhận xét của khóa học X. "
            + "Không dùng để liệt kê bài tập chưa nộp; dùng getCourseAssignments cho danh sách bài tập/quiz.")
    @Transactional(readOnly = true)
    public String getGradesByCourse(
            @ToolParam(description = "Tên khóa học hoặc một phần tên khóa học cần xem điểm/bài nộp") String courseName) {
        User u = user();
        log.info("Chat tool start name=getGradesByCourse userId={} role={} courseName='{}'",
                u.getId(), u.getRole(), courseName);
        Course course = findManagedCourse(u, courseName);
        if (course == null) {
            log.info("Chat tool end name=getGradesByCourse userId={} role={} courseFound=false returned=0",
                    u.getId(), u.getRole());
            return "Khong tim thay khoa hoc '" + courseName + "' trong danh sach quan ly.";
        }

        List<Submission> rows = submissionRepository.findByAssignmentCourseIdIn(List.of(course.getId())).stream()
                .sorted(Comparator.comparing(Submission::getSubmittedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(MAX).toList();
        if (rows.isEmpty()) {
            log.info("Chat tool end name=getGradesByCourse userId={} role={} courseId={} returned=0",
                    u.getId(), u.getRole(), course.getId());
            return "Khoa '" + course.getTitle() + "' chua co bai nop nao.";
        }
        log.info("Chat tool end name=getGradesByCourse userId={} role={} courseId={} returned={}",
                u.getId(), u.getRole(), course.getId(), rows.size());

        StringBuilder sb = new StringBuilder("[Diem - " + course.getTitle() + " - " + rows.size() + " bai]\n");
        for (Submission s : rows) {
            sb.append("- SV: ").append(s.getUser().getFullName())
              .append(" | Bai: ").append(s.getAssignment().getTitle())
              .append(" | Diem: ").append(ChatTextUtils.submissionScore(s)).append("/").append(s.getAssignment().getMaxScore())
              .append(" | Nop: ").append(ChatTextUtils.formatDateTime(s.getSubmittedAt()))
              .append(" | Tre: ").append(Boolean.TRUE.equals(s.getIsLate()) ? "co" : "khong")
              .append(" | NX: ").append(ChatTextUtils.truncateBlank(s.getFeedback())).append("\n");
        }
        return sb.toString();
    }

    @PreAuthorize("hasAnyRole('INSTRUCTOR','ADMIN')")
    @Tool(description = "Lấy tiến độ học tập của sinh viên trong một khóa học cụ thể mà instructor/admin quản lý. "
            + "Dùng khi người dùng hỏi tiến độ, bài đã hoàn thành, thời lượng xem bài học của khóa học X.")
    @Transactional(readOnly = true)
    public String getProgressByCourse(
            @ToolParam(description = "Tên khóa học hoặc một phần tên khóa học cần xem tiến độ") String courseName) {
        User u = user();
        log.info("Chat tool start name=getProgressByCourse userId={} role={} courseName='{}'",
                u.getId(), u.getRole(), courseName);
        Course course = findManagedCourse(u, courseName);
        if (course == null) {
            log.info("Chat tool end name=getProgressByCourse userId={} role={} courseFound=false returned=0",
                    u.getId(), u.getRole());
            return "Khong tim thay khoa hoc '" + courseName + "' trong danh sach quan ly.";
        }

        List<LessonProgress> rows = lessonProgressRepository.findByLessonChapterCourseIdIn(List.of(course.getId())).stream()
                .limit(MAX).toList();
        if (rows.isEmpty()) {
            log.info("Chat tool end name=getProgressByCourse userId={} role={} courseId={} returned=0",
                    u.getId(), u.getRole(), course.getId());
            return "Khoa '" + course.getTitle() + "' chua co tien do.";
        }
        log.info("Chat tool end name=getProgressByCourse userId={} role={} courseId={} returned={}",
                u.getId(), u.getRole(), course.getId(), rows.size());

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
    @Tool(description = "Tra cứu tổng quan học tập của một sinh viên cụ thể trong các khóa học instructor/admin quản lý. "
            + "Trả về các bài nộp/điểm gần đây và tóm tắt tiến độ của sinh viên đó. "
            + "Dùng khi người dùng hỏi 'sinh viên A học thế nào', 'điểm của sinh viên A', 'tiến độ của sinh viên A'. "
            + "Không dùng cho câu hỏi về toàn bộ lớp/khóa học; dùng getGradesByCourse hoặc getProgressByCourse khi có tên khóa học.")
    @Transactional(readOnly = true)
    public String getStudentInfo(
            @ToolParam(description = "Tên sinh viên hoặc một phần tên sinh viên cần tra cứu") String studentName) {
        User u = user();
        log.info("Chat tool start name=getStudentInfo userId={} role={} studentName='{}'",
                u.getId(), u.getRole(), studentName);
        List<Long> courseIds = managedCourseIds(u);
        if (courseIds.isEmpty()) {
            log.info("Chat tool end name=getStudentInfo userId={} role={} managedCourseCount=0 returned=0",
                    u.getId(), u.getRole());
            return "Khong co khoa hoc nao.";
        }

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

        if (students.isEmpty()) {
            log.info("Chat tool end name=getStudentInfo userId={} role={} matchedStudents=0 returned=0",
                    u.getId(), u.getRole());
            return "Khong tim thay sinh vien '" + studentName + "'.";
        }
        log.info("Chat tool end name=getStudentInfo userId={} role={} matchedStudents={}",
                u.getId(), u.getRole(), students.size());

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
                      .append(" | ").append(ChatTextUtils.submissionScore(s)).append("/").append(s.getAssignment().getMaxScore())
                      .append(" | ").append(ChatTextUtils.formatDateTime(s.getSubmittedAt())).append("\n");
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
        if (currentUserService.hasRole("ADMIN")) return courseRepository.findAll();
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
