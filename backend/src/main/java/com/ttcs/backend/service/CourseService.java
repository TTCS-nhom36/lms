package com.ttcs.backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ttcs.backend.dto.request.CreateCourseRequest;
import com.ttcs.backend.dto.response.ChapterResponse;
import com.ttcs.backend.dto.response.CourseDetailResponse;
import com.ttcs.backend.dto.response.CourseResponse;
import com.ttcs.backend.dto.response.EnrollmentResponse;
import com.ttcs.backend.dto.response.GradebookEntryResponse;
import com.ttcs.backend.dto.response.GradebookResponse;
import com.ttcs.backend.dto.response.PageResponse;
import com.ttcs.backend.dto.response.UserResponse;
import com.ttcs.backend.entity.Assignment;
import com.ttcs.backend.entity.Chapter;
import com.ttcs.backend.entity.Course;
import com.ttcs.backend.entity.Enrollment;
import com.ttcs.backend.entity.Submission;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.enums.CourseStatus;
import com.ttcs.backend.enums.EnrollmentStatus;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.mapper.ChapterMapper;
import com.ttcs.backend.mapper.CourseMapper;
import com.ttcs.backend.mapper.EnrollmentMapper;
import com.ttcs.backend.mapper.UserMapper;
import com.ttcs.backend.repository.AssignmentRepository;
import com.ttcs.backend.repository.ChapterRepository;
import com.ttcs.backend.repository.CourseRepository;
import com.ttcs.backend.repository.EnrollmentRepository;
import com.ttcs.backend.repository.LessonProgressRepository;
import com.ttcs.backend.repository.LessonRepository;
import com.ttcs.backend.repository.SubmissionRepository;
import com.ttcs.backend.repository.UserRepository;
import com.ttcs.backend.utils.PageUtils;

@Service
@Transactional
public class CourseService {

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final ChapterRepository chapterRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final CourseMapper courseMapper;
    private final ChapterMapper chapterMapper;
    private final EnrollmentMapper enrollmentMapper;
    private final UserMapper userMapper;
    private final CurrentUserService currentUserService;

    public CourseService(CourseRepository courseRepository, UserRepository userRepository, ChapterRepository chapterRepository, EnrollmentRepository enrollmentRepository, AssignmentRepository assignmentRepository, SubmissionRepository submissionRepository, LessonRepository lessonRepository, LessonProgressRepository lessonProgressRepository, CourseMapper courseMapper, ChapterMapper chapterMapper, EnrollmentMapper enrollmentMapper, UserMapper userMapper, CurrentUserService currentUserService) {
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.chapterRepository = chapterRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.assignmentRepository = assignmentRepository;
        this.submissionRepository = submissionRepository;
        this.lessonRepository = lessonRepository;
        this.lessonProgressRepository = lessonProgressRepository;
        this.courseMapper = courseMapper;
        this.chapterMapper = chapterMapper;
        this.enrollmentMapper = enrollmentMapper;
        this.userMapper = userMapper;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<CourseResponse> findAll() {
        return courseRepository.findAll().stream().map(courseMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<CourseResponse> findPage(String search, CourseStatus status, int page, int size) {
        List<CourseResponse> filteredCourses = courseRepository.findAll().stream()
                .filter(course -> matchesSearch(course, search))
                .filter(course -> status == null || course.getStatus() == status)
                .sorted(Comparator.comparing(Course::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(courseMapper::toResponse)
                .toList();
        return PageUtils.paginate(filteredCourses, page, size);
    }

    @Transactional(readOnly = true)
    public CourseResponse findById(Long id) {
        return courseMapper.toResponse(findCourseEntityById(id));
    }

    @Transactional(readOnly = true)
    public CourseDetailResponse findDetail(Long id) {
        CourseResponse course = findById(id);
        List<ChapterResponse> chapters = chapterRepository.findByCourseIdOrderByOrderIndex(id).stream()
                .sorted(Comparator.comparing(Chapter::getOrderIndex, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(chapterMapper::toResponse)
                .toList();
        return new CourseDetailResponse(course, chapters);
    }

    public CourseResponse create(CreateCourseRequest request) {
        Course course = courseMapper.toEntity(request);
        course.setCreatedBy(findRequiredUser(request.getCreatedById()));
        if (course.getStatus() == null) {
            course.setStatus(CourseStatus.DRAFT);
        }
        return courseMapper.toResponse(courseRepository.save(course));
    }

    public CourseResponse update(Long id, CreateCourseRequest request) {
        Course course = findCourseEntityById(id);
        assertCanManageCourse(course);
        course.setTitle(request.getTitle());
        course.setDescription(request.getDescription());
        course.setThumbnailUrl(request.getThumbnailUrl());
        course.setStatus(request.getStatus());
        if (currentUserService.hasRole("ADMIN") && request.getCreatedById() != null) {
            course.setCreatedBy(findUserEntityById(request.getCreatedById()));
        }
        return courseMapper.toResponse(courseRepository.save(course));
    }

    public void delete(Long id) {
        Course course = findCourseEntityById(id);
        assertCanManageCourse(course);
        courseRepository.delete(course);
    }

    public CourseResponse archive(Long id) {
        Course course = findCourseEntityById(id);
        assertCanManageCourse(course);
        course.setStatus(CourseStatus.ARCHIVED);
        return courseMapper.toResponse(courseRepository.save(course));
    }

    public CourseResponse publish(Long id) {
        Course course = findCourseEntityById(id);
        assertCanManageCourse(course);
        course.setStatus(CourseStatus.PUBLISHED);
        return courseMapper.toResponse(courseRepository.save(course));
    }

    public EnrollmentResponse enroll(Long courseId, UUID userId) {
        Course course = findCourseEntityById(courseId);
        return enrollIntoCourse(course, userId);
    }

    public EnrollmentResponse enrollStudent(Long courseId, UUID userId) {
        Course course = findCourseEntityById(courseId);
        assertCanManageCourse(course);
        return enrollIntoCourse(course, userId);
    }

    public void unenrollStudent(Long courseId, UUID userId) {
        Course course = findCourseEntityById(courseId);
        assertCanManageCourse(course);
        Enrollment enrollment = enrollmentRepository.findByCourseId(courseId).stream()
                .filter(item -> item.getUser() != null && userId.equals(item.getUser().getId()))
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Enrollment not found"));
        enrollment.setStatus(EnrollmentStatus.DROPPED);
        enrollmentRepository.save(enrollment);
    }

    private EnrollmentResponse enrollIntoCourse(Course course, UUID userId) {
        Long courseId = course.getId();
        User user = findUserEntityById(userId);
        Enrollment existingEnrollment = enrollmentRepository.findByCourseId(courseId).stream()
                .filter(enrollment -> enrollment.getUser() != null && userId.equals(enrollment.getUser().getId()))
                .findFirst()
                .orElse(null);
        if (existingEnrollment != null) {
            existingEnrollment.setStatus(EnrollmentStatus.ACTIVE);
            existingEnrollment.setCourse(course);
            existingEnrollment.setUser(user);
            return enrollmentMapper.toResponse(enrollmentRepository.save(existingEnrollment));
        }
        Enrollment enrollment = new Enrollment();
        enrollment.setCourse(course);
        enrollment.setUser(user);
        enrollment.setStatus(EnrollmentStatus.ACTIVE);
        return enrollmentMapper.toResponse(enrollmentRepository.save(enrollment));
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findStudents(Long courseId) {
        assertCanManageCourse(findCourseEntityById(courseId));
        return enrollmentRepository.findByCourseId(courseId).stream()
                .filter(enrollment -> enrollment.getStatus() != EnrollmentStatus.DROPPED)
                .map(Enrollment::getUser)
                .distinct()
                .map(userMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CourseResponse> findMyCourses(UUID userId) {
        return enrollmentRepository.findByUserId(userId).stream()
                .filter(enrollment -> enrollment.getStatus() != EnrollmentStatus.DROPPED)
                .map(enrollment -> {
                    CourseResponse cr = courseMapper.toResponse(enrollment.getCourse());
                    cr.setProgressPercent(calculateCourseProgress(enrollment.getCourse().getId(), userId));
                    return cr;
                })
                .distinct()
                .toList();
    }

    private Double calculateCourseProgress(Long courseId, UUID userId) {
        long totalLessons = lessonRepository.findByChapterCourseIdIn(List.of(courseId)).stream()
            .count();
        if (totalLessons == 0) return 0.0;
        long completedLessons = lessonProgressRepository.findByLessonChapterCourseIdIn(List.of(courseId)).stream()
            .filter(p -> p.getUser() != null && userId.equals(p.getUser().getId()))
            .filter(p -> Boolean.TRUE.equals(p.getIsCompleted()))
            .count();
        return Math.round((double) completedLessons * 100 / totalLessons * 10.0) / 10.0;
    }

    @Transactional(readOnly = true)
    public GradebookResponse findGradebook(Long courseId) {
        Course course = findCourseEntityById(courseId);
        assertCanManageCourse(course);
        List<Assignment> assignments = assignmentRepository.findByCourseId(courseId);
        List<Enrollment> enrollments = enrollmentRepository.findByCourseId(courseId);
        List<Submission> submissions = submissionRepository.findByAssignmentCourseIdIn(List.of(courseId));

        List<GradebookEntryResponse> entries = enrollments.stream()
                .map(enrollment -> buildGradebookEntry(enrollment, assignments, submissions))
                .toList();
        return new GradebookResponse(course.getId(), course.getTitle(), entries);
    }

    @Transactional(readOnly = true)
    public byte[] exportGradebook(Long courseId) {
        GradebookResponse gradebook = findGradebook(courseId);
        try (var workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             var outputStream = new java.io.ByteArrayOutputStream()) {
            var sheet = workbook.createSheet("Gradebook");
            var header = sheet.createRow(0);
            String[] columns = {"User ID", "Full Name", "Email", "Enrollment Status", "Total Assignments", "Submitted Assignments", "Average Score"};
            for (int index = 0; index < columns.length; index++) {
                header.createCell(index).setCellValue(columns[index]);
            }
            for (int rowIndex = 0; rowIndex < gradebook.entries().size(); rowIndex++) {
                GradebookEntryResponse entry = gradebook.entries().get(rowIndex);
                var row = sheet.createRow(rowIndex + 1);
                row.createCell(0).setCellValue(entry.userId() != null ? entry.userId().toString() : "");
                row.createCell(1).setCellValue(entry.fullName() != null ? entry.fullName() : "");
                row.createCell(2).setCellValue(entry.email() != null ? entry.email() : "");
                row.createCell(3).setCellValue(entry.enrollmentStatus() != null ? entry.enrollmentStatus().name() : "");
                row.createCell(4).setCellValue(entry.totalAssignments());
                row.createCell(5).setCellValue(entry.submittedAssignments());
                row.createCell(6).setCellValue(entry.averageScore() != null ? entry.averageScore().doubleValue() : 0.0);
            }
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (java.io.IOException exception) {
            throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to export gradebook", exception);
        }
    }

    private Course findCourseEntityById(Long id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Course not found: " + id));
    }

    private User findUserEntityById(java.util.UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found: " + id));
    }

    private User findRequiredUser(UUID id) {
        if (id == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "createdById is required");
        }
        return findUserEntityById(id);
    }

    private void assertCanManageCourse(Course course) {
        if (currentUserService.hasRole("ADMIN")) {
            return;
        }
        UUID currentUserId = currentUserService.getCurrentUserId();
        if (course.getCreatedBy() != null && currentUserId.equals(course.getCreatedBy().getId())) {
            return;
        }
        throw new AppException(ErrorCode.ACCESS_DENIED, "You are not allowed to manage this course");
    }

    private boolean matchesSearch(Course course, String search) {
        if (search == null || search.isBlank()) {
            return true;
        }
        String normalizedSearch = search.trim().toLowerCase();
        return (course.getTitle() != null && course.getTitle().toLowerCase().contains(normalizedSearch))
                || (course.getDescription() != null && course.getDescription().toLowerCase().contains(normalizedSearch));
    }

    private GradebookEntryResponse buildGradebookEntry(Enrollment enrollment, List<Assignment> assignments, List<Submission> submissions) {
        UUID userId = enrollment.getUser() != null ? enrollment.getUser().getId() : null;
        List<Submission> userSubmissions = submissions.stream()
                .filter(submission -> submission.getUser() != null && userId != null && userId.equals(submission.getUser().getId()))
                .toList();
        long submittedAssignments = userSubmissions.stream()
                .map(submission -> submission.getAssignment() != null ? submission.getAssignment().getId() : null)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .count();
        BigDecimal averageScore = userSubmissions.isEmpty() ? BigDecimal.ZERO : userSubmissions.stream()
                .map(submission -> submission.getFinalScore() != null ? submission.getFinalScore()
                        : submission.getManualScore() != null ? submission.getManualScore() : submission.getAutoScore())
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(userSubmissions.size()), 2, RoundingMode.HALF_UP);
        return new GradebookEntryResponse(
                userId,
                enrollment.getUser() != null ? enrollment.getUser().getFullName() : null,
                enrollment.getUser() != null ? enrollment.getUser().getEmail() : null,
                enrollment.getStatus(),
                assignments.size(),
                submittedAssignments,
                averageScore
        );
    }
}
