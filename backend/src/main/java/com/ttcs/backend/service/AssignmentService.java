package com.ttcs.backend.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ttcs.backend.dto.request.CreateAssignmentRequest;
import com.ttcs.backend.dto.request.CreateQuestionRequest;
import com.ttcs.backend.dto.response.AssignmentResponse;
import com.ttcs.backend.dto.response.QuestionResponse;
import com.ttcs.backend.dto.response.SubmissionResponse;
import com.ttcs.backend.entity.Assignment;
import com.ttcs.backend.entity.Course;
import com.ttcs.backend.entity.Lesson;
import com.ttcs.backend.entity.Question;
import com.ttcs.backend.entity.Submission;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.mapper.AssignmentMapper;
import com.ttcs.backend.mapper.QuestionMapper;
import com.ttcs.backend.mapper.SubmissionMapper;
import com.ttcs.backend.repository.AssignmentRepository;
import com.ttcs.backend.repository.CourseRepository;
import com.ttcs.backend.repository.EnrollmentRepository;
import com.ttcs.backend.repository.LessonRepository;
import com.ttcs.backend.repository.QuestionRepository;
import com.ttcs.backend.repository.SubmissionRepository;
import com.ttcs.backend.repository.UserRepository;

@Service
@Transactional
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;
    private final QuestionRepository questionRepository;
    private final SubmissionRepository submissionRepository;
    private final AssignmentMapper assignmentMapper;
    private final QuestionMapper questionMapper;
    private final SubmissionMapper submissionMapper;
    private final com.ttcs.backend.repository.QuizAttemptRepository quizAttemptRepository;
    private final CurrentUserService currentUserService;
    private final EnrollmentRepository enrollmentRepository;

    public AssignmentService(AssignmentRepository assignmentRepository, CourseRepository courseRepository, LessonRepository lessonRepository, UserRepository userRepository, QuestionRepository questionRepository, SubmissionRepository submissionRepository, AssignmentMapper assignmentMapper, QuestionMapper questionMapper, SubmissionMapper submissionMapper, com.ttcs.backend.repository.QuizAttemptRepository quizAttemptRepository, CurrentUserService currentUserService, EnrollmentRepository enrollmentRepository) {
        this.assignmentRepository = assignmentRepository;
        this.courseRepository = courseRepository;
        this.lessonRepository = lessonRepository;
        this.userRepository = userRepository;
        this.questionRepository = questionRepository;
        this.submissionRepository = submissionRepository;
        this.assignmentMapper = assignmentMapper;
        this.questionMapper = questionMapper;
        this.submissionMapper = submissionMapper;
        this.quizAttemptRepository = quizAttemptRepository;
        this.currentUserService = currentUserService;
        this.enrollmentRepository = enrollmentRepository;
    }

    @Transactional(readOnly = true)
    public List<AssignmentResponse> findAll() {
        return assignmentRepository.findAll().stream().map(assignmentMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AssignmentResponse> findByCourseId(Long courseId) {
        return assignmentRepository.findAll().stream()
                .filter(assignment -> assignment.getCourse() != null && courseId.equals(assignment.getCourse().getId()))
                .map(assignmentMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AssignmentResponse findById(Long id) {
        return assignmentMapper.toResponse(findAssignmentEntityById(id));
    }

    public AssignmentResponse create(CreateAssignmentRequest request) {
        if (request.getCourseId() == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Course ID is required");
        }
        if (request.getCreatedById() == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Created By ID is required");
        }
        Assignment assignment = assignmentMapper.toEntity(request);
        Course course = findCourseById(request.getCourseId());
        assertCanManageCourse(course);
        assignment.setCourse(course);
        if (request.getLessonId() != null) {
            assignment.setLesson(findLessonById(request.getLessonId()));
        }
        assignment.setCreatedBy(findUserById(request.getCreatedById()));
        return assignmentMapper.toResponse(assignmentRepository.save(assignment));
    }

    public AssignmentResponse createForCourse(Long courseId, CreateAssignmentRequest request) {
        if (courseId == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Course ID is required");
        }
        request.setCourseId(courseId);
        return create(request);
    }

    public AssignmentResponse update(Long id, CreateAssignmentRequest request) {
        Assignment assignment = findAssignmentEntityById(id);
        assertCanManageAssignment(assignment);
        // Only update course if explicitly provided (keep existing if not)
        if (request.getCourseId() != null) {
            assignment.setCourse(findCourseById(request.getCourseId()));
        }
        assignment.setLesson(request.getLessonId() != null ? findLessonById(request.getLessonId()) : assignment.getLesson());
        assignment.setTitle(request.getTitle());
        assignment.setDescription(request.getDescription());
        assignment.setType(request.getType());
        assignment.setDueDate(request.getDueDate());
        if (request.getAllowLate() != null) assignment.setAllowLate(request.getAllowLate());
        if (request.getMaxScore() != null) assignment.setMaxScore(request.getMaxScore());
        if (request.getWeight() != null) assignment.setWeight(request.getWeight());
        if (request.getTimeLimitMins() != null) assignment.setTimeLimitMins(request.getTimeLimitMins());
        if (request.getShuffleQuestions() != null) assignment.setShuffleQuestions(request.getShuffleQuestions());
        if (request.getShuffleOptions() != null) assignment.setShuffleOptions(request.getShuffleOptions());
        // Keep existing creator if not provided
        if (request.getCreatedById() != null) {
            assignment.setCreatedBy(findUserById(request.getCreatedById()));
        }
        return assignmentMapper.toResponse(assignmentRepository.save(assignment));
    }

    public void delete(Long id) {
        Assignment assignment = findAssignmentEntityById(id);
        assertCanManageAssignment(assignment);
        
        // Delete QuizAttempts manually first to prevent FK constraint violations
        // (SelectedAnswer references QuestionOption, so we must delete SelectedAnswers before QuestionOptions)
        List<com.ttcs.backend.entity.QuizAttempt> attempts = quizAttemptRepository.findByAssignmentId(id);
        quizAttemptRepository.deleteAll(attempts);

        assignmentRepository.delete(assignment);
    }

    public QuestionResponse addQuestion(Long assignmentId, CreateQuestionRequest request) {
        Assignment assignment = findAssignmentEntityById(assignmentId);
        assertCanManageAssignment(assignment);
        Question question = questionMapper.toEntity(request);
        question.setAssignment(assignment);
        return questionMapper.toResponse(questionRepository.save(question));
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> findSubmissions(Long assignmentId) {
        assertCanManageAssignment(findAssignmentEntityById(assignmentId));
        return submissionRepository.findAll().stream()
                .filter(submission -> submission.getAssignment() != null && assignmentId.equals(submission.getAssignment().getId()))
                .map(submissionMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SubmissionResponse findMySubmission(Long assignmentId, UUID userId) {
        Submission submission = submissionRepository.findAll().stream()
                .filter(item -> item.getAssignment() != null && assignmentId.equals(item.getAssignment().getId()))
                .filter(item -> item.getUser() != null && userId.equals(item.getUser().getId()))
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Submission not found for this user"));
        return submissionMapper.toResponse(submission);
    }

    @Transactional(readOnly = true)
    public List<QuestionResponse> findQuestions(Long assignmentId) {
        Assignment assignment = findAssignmentEntityById(assignmentId);
        if (!currentUserService.hasRole("ADMIN")
                && !currentUserService.hasRole("INSTRUCTOR")
                && !hasEnrollment(assignment.getCourse(), currentUserService.getCurrentUserId())) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Assignment requires enrollment");
        }
        return questionRepository.findAll().stream()
                .filter(question -> question.getAssignment() != null && assignmentId.equals(question.getAssignment().getId()))
                .map(questionMapper::toResponse)
                .toList();
    }

    private Assignment findAssignmentEntityById(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Assignment not found: " + id));
    }

    private Course findCourseById(Long id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Course not found: " + id));
    }

    private Lesson findLessonById(Long id) {
        return lessonRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Lesson not found: " + id));
    }

    private User findUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found: " + id));
    }

    private void assertCanManageAssignment(Assignment assignment) {
        assertCanManageCourse(assignment.getCourse());
    }

    private void assertCanManageCourse(Course course) {
        if (course == null) {
            throw new AppException(ErrorCode.NOT_FOUND, "Course not found");
        }
        if (currentUserService.hasRole("ADMIN")) {
            return;
        }
        UUID currentUserId = currentUserService.getCurrentUserId();
        if (course.getCreatedBy() != null && currentUserId.equals(course.getCreatedBy().getId())) {
            return;
        }
        throw new AppException(ErrorCode.ACCESS_DENIED, "You are not allowed to manage this course");
    }

    private boolean hasEnrollment(Course course, UUID userId) {
        if (course == null || userId == null) {
            return false;
        }
        return enrollmentRepository.findAll().stream()
                .anyMatch(enrollment -> enrollment.getUser() != null
                        && userId.equals(enrollment.getUser().getId())
                        && enrollment.getCourse() != null
                        && course.getId().equals(enrollment.getCourse().getId()));
    }
}
