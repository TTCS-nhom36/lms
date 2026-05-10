package com.ttcs.backend.service;

import com.ttcs.backend.entity.Assignment;
import com.ttcs.backend.entity.Course;
import com.ttcs.backend.entity.Enrollment;
import com.ttcs.backend.entity.Lesson;
import com.ttcs.backend.entity.LessonProgress;
import com.ttcs.backend.entity.Submission;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.enums.UserRole;
import com.ttcs.backend.repository.AssignmentRepository;
import com.ttcs.backend.repository.CourseRepository;
import com.ttcs.backend.repository.EnrollmentRepository;
import com.ttcs.backend.repository.LessonProgressRepository;
import com.ttcs.backend.repository.LessonRepository;
import com.ttcs.backend.repository.SubmissionRepository;
import java.text.Normalizer;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.function.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChatBusinessService {

    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final int MAX_ROWS = 8;

    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final ChatSemanticSearchService chatSemanticSearchService;

    @Transactional(readOnly = true)
    public ChatRelevantData findRelevantData(User user, ChatIntentAnalysis intent, String question) {
        String normalizedQuestion = normalize(question);
        StringBuilder context = new StringBuilder();
        context.append("====== RELEVANT DATA FROM DATABASE ======\n");
        context.append("Intent: ").append(intent.types()).append("\n\n");

        appendCourses(context, user, intent, normalizedQuestion);
        appendAssignments(context, user, intent, normalizedQuestion);
        appendSubmissions(context, user, intent, normalizedQuestion);
        appendProgressAndLessons(context, user, intent, normalizedQuestion);

        if (!context.toString().endsWith("\n\n")) {
            context.append("Khong tim thay du lieu phu hop trong database.\n");
        }

        appendSemanticSearchContext(context, user, question);

        return new ChatRelevantData(context.toString());
    }

    private void appendSemanticSearchContext(StringBuilder context, User user, String question) {
        context.append("\n====== SEMANTIC SEARCH FROM QDRANT ======\n");
        context.append(chatSemanticSearchService.search(user, question)).append("\n");
    }

    private void appendCourses(StringBuilder context, User user, ChatIntentAnalysis intent, String query) {
        if (!shouldSearchCourses(intent)) {
            return;
        }

        List<Course> courses = preferMatches(visibleCourses(user), query, course -> matches(query,
                course.getTitle(), course.getDescription(), course.getCreatedBy().getFullName()))
                .stream()
                .limit(MAX_ROWS)
                .toList();

        if (courses.isEmpty()) {
            return;
        }

        context.append("[Khoa hoc]\n");
        for (Course course : courses) {
            context.append("- ID ").append(course.getId())
                    .append(": ").append(course.getTitle())
                    .append(" | Trang thai: ").append(course.getStatus())
                    .append(" | Giang vien: ").append(course.getCreatedBy().getFullName())
                    .append(" | Mo ta: ").append(blankToDash(course.getDescription()))
                    .append("\n");
        }
        context.append("\n");
    }

    private void appendAssignments(StringBuilder context, User user, ChatIntentAnalysis intent, String query) {
        if (!intent.has(ChatIntentAnalysis.Type.ASSIGNMENT) && !intent.has(ChatIntentAnalysis.Type.GENERAL)) {
            return;
        }

        List<Long> visibleCourseIds = visibleCourses(user).stream().map(Course::getId).toList();
        List<Assignment> visibleAssignments = assignmentRepository.findAll().stream()
                .filter(assignment -> visibleCourseIds.contains(assignment.getCourse().getId()))
                .sorted(Comparator.comparing(Assignment::getDueDate,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        List<Assignment> assignments = preferMatches(visibleAssignments, query, assignment -> matches(query,
                assignment.getTitle(), assignment.getDescription(), assignment.getCourse().getTitle()))
                .stream()
                .limit(MAX_ROWS)
                .toList();

        if (assignments.isEmpty()) {
            return;
        }

        context.append("[Bai tap / quiz]\n");
        for (Assignment assignment : assignments) {
            context.append("- ID ").append(assignment.getId())
                    .append(": ").append(assignment.getTitle())
                    .append(" | Khoa: ").append(assignment.getCourse().getTitle())
                    .append(" | Loai: ").append(assignment.getType())
                    .append(" | Han nop: ").append(formatDate(assignment.getDueDate()))
                    .append(" | Diem toi da: ").append(assignment.getMaxScore())
                    .append(" | Mo ta: ").append(blankToDash(assignment.getDescription()))
                    .append("\n");
        }
        context.append("\n");
    }

    private void appendSubmissions(StringBuilder context, User user, ChatIntentAnalysis intent, String query) {
        if (!intent.has(ChatIntentAnalysis.Type.GRADE) && !intent.has(ChatIntentAnalysis.Type.ASSIGNMENT)) {
            return;
        }

        List<Submission> visibleSubmissions = submissionsVisibleTo(user).stream()
                .sorted(Comparator.comparing(Submission::getSubmittedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        List<Submission> submissions = preferMatches(visibleSubmissions, query, submission -> matches(query,
                submission.getAssignment().getTitle(),
                submission.getAssignment().getCourse().getTitle(), submission.getFeedback()))
                .stream()
                .limit(MAX_ROWS)
                .toList();

        if (submissions.isEmpty()) {
            return;
        }

        context.append("[Diem / bai da nop]\n");
        for (Submission submission : submissions) {
            Assignment assignment = submission.getAssignment();
            context.append("- ").append(assignment.getTitle())
                    .append(" | Khoa: ").append(assignment.getCourse().getTitle())
                    .append(" | Sinh vien: ").append(submission.getUser().getFullName())
                    .append(" | Diem: ").append(scoreOf(submission)).append("/").append(assignment.getMaxScore())
                    .append(" | Nop luc: ").append(formatDate(submission.getSubmittedAt()))
                    .append(" | Tre: ").append(Boolean.TRUE.equals(submission.getIsLate()) ? "co" : "khong")
                    .append(" | Nhan xet: ").append(blankToDash(submission.getFeedback()))
                    .append("\n");
        }
        context.append("\n");
    }

    private void appendProgressAndLessons(StringBuilder context, User user, ChatIntentAnalysis intent, String query) {
        if (!intent.has(ChatIntentAnalysis.Type.PROGRESS) && !intent.has(ChatIntentAnalysis.Type.LESSON_CONTENT)) {
            return;
        }

        List<LessonProgress> progressRows = preferMatches(lessonProgressRepository.findByUserId(user.getId()),
                query, progress -> matches(query,
                        progress.getLesson().getTitle(),
                        progress.getLesson().getChapter().getTitle(),
                        progress.getLesson().getChapter().getCourse().getTitle()))
                .stream()
                .limit(MAX_ROWS)
                .toList();

        if (!progressRows.isEmpty()) {
            context.append("[Tien do hoc tap]\n");
            for (LessonProgress progress : progressRows) {
                Lesson lesson = progress.getLesson();
                context.append("- ").append(lesson.getTitle())
                        .append(" | Khoa: ").append(lesson.getChapter().getCourse().getTitle())
                        .append(" | Hoan thanh: ").append(Boolean.TRUE.equals(progress.getIsCompleted()) ? "co" : "khong")
                        .append(" | Thoi luong xem: ").append(progress.getWatchDurationSecs()).append(" giay")
                        .append(" | Truy cap gan nhat: ").append(formatDate(progress.getLastAccessedAt()))
                        .append("\n");
            }
            context.append("\n");
        }

        List<Long> visibleCourseIds = visibleCourses(user).stream().map(Course::getId).toList();
        List<Lesson> visibleLessons = lessonRepository.findAll().stream()
                .filter(lesson -> visibleCourseIds.contains(lesson.getChapter().getCourse().getId()))
                .toList();
        List<Lesson> lessons = preferMatches(visibleLessons, query, lesson -> matches(query,
                lesson.getTitle(), lesson.getContentText(),
                lesson.getChapter().getTitle(), lesson.getChapter().getCourse().getTitle()))
                .stream()
                .limit(MAX_ROWS)
                .toList();

        if (lessons.isEmpty()) {
            return;
        }

        context.append("[Bai hoc]\n");
        for (Lesson lesson : lessons) {
            context.append("- ID ").append(lesson.getId())
                    .append(": ").append(lesson.getTitle())
                    .append(" | Chuong: ").append(lesson.getChapter().getTitle())
                    .append(" | Khoa: ").append(lesson.getChapter().getCourse().getTitle())
                    .append(" | Loai: ").append(lesson.getContentType())
                    .append(" | Noi dung tom tat: ").append(shorten(lesson.getContentText(), 240))
                    .append("\n");
        }
        context.append("\n");
    }

    private boolean shouldSearchCourses(ChatIntentAnalysis intent) {
        return intent.has(ChatIntentAnalysis.Type.COURSE)
                || intent.has(ChatIntentAnalysis.Type.ENROLLMENT)
                || intent.has(ChatIntentAnalysis.Type.GENERAL);
    }

    private List<Course> visibleCourses(User user) {
        if (user.getRole() == UserRole.ADMIN) {
            return courseRepository.findAll();
        }
        if (user.getRole() == UserRole.INSTRUCTOR) {
            return courseRepository.findAll().stream()
                    .filter(course -> course.getCreatedBy().getId().equals(user.getId()))
                    .toList();
        }
        return enrollmentRepository.findAll().stream()
                .filter(enrollment -> enrollment.getUser().getId().equals(user.getId()))
                .map(Enrollment::getCourse)
                .toList();
    }

    private List<Submission> submissionsVisibleTo(User user) {
        if (user.getRole() == UserRole.ADMIN) {
            return submissionRepository.findAll();
        }
        if (user.getRole() == UserRole.INSTRUCTOR) {
            return submissionRepository.findAll().stream()
                    .filter(submission -> submission.getAssignment().getCourse().getCreatedBy().getId().equals(user.getId()))
                    .toList();
        }
        return submissionRepository.findByUserId(user.getId());
    }

    private boolean matches(String query, String... values) {
        if (query.isBlank()) {
            return true;
        }
        List<String> meaningfulTokens = List.of(query.split("\\s+")).stream()
                .map(String::trim)
                .filter(token -> token.length() >= 3)
                .filter(token -> !isStopWord(token))
                .toList();
        for (String value : values) {
            if (value != null) {
                String normalizedValue = normalize(value);
                if (normalizedValue.contains(query)) {
                    return true;
                }
                for (String token : meaningfulTokens) {
                    if (normalizedValue.contains(token)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private <T> List<T> preferMatches(List<T> rows, String query, Predicate<T> predicate) {
        if (query.isBlank()) {
            return rows;
        }
        List<T> matchedRows = rows.stream().filter(predicate).toList();
        return matchedRows.isEmpty() ? rows : matchedRows;
    }

    private boolean isStopWord(String token) {
        return List.of("cua", "của", "toi", "tôi", "ban", "bạn", "cho", "voi", "với",
                        "trong", "nhung", "những", "cac", "các", "hay", "hãy", "giup",
                        "giúp", "minh", "mình", "em", "anh", "chi", "chị")
                .contains(token);
    }

    private String normalize(String value) {
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

    private String blankToDash(String value) {
        return value == null || value.isBlank() ? "-" : shorten(value, 180);
    }

    private String shorten(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength) + "...";
    }

    private String formatDate(java.time.LocalDateTime value) {
        return value == null ? "-" : value.format(DATE_TIME);
    }

    private String scoreOf(Submission submission) {
        if (submission.getFinalScore() != null) {
            return submission.getFinalScore().toString();
        }
        if (submission.getManualScore() != null) {
            return submission.getManualScore().toString();
        }
        if (submission.getAutoScore() != null) {
            return submission.getAutoScore() + " (tu cham)";
        }
        return "chua cham";
    }
}
