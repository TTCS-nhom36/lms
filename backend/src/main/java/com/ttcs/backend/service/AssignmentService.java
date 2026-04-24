package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.CreateQuestionRequest;
import com.ttcs.backend.dto.request.CreateAssignmentRequest;
import com.ttcs.backend.dto.response.QuestionResponse;
import com.ttcs.backend.dto.response.AssignmentResponse;
import com.ttcs.backend.dto.response.SubmissionResponse;
import com.ttcs.backend.entity.Assignment;
import com.ttcs.backend.entity.Course;
import com.ttcs.backend.entity.Lesson;
import com.ttcs.backend.entity.Question;
import com.ttcs.backend.entity.Submission;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.mapper.AssignmentMapper;
import com.ttcs.backend.mapper.QuestionMapper;
import com.ttcs.backend.mapper.SubmissionMapper;
import com.ttcs.backend.repository.AssignmentRepository;
import com.ttcs.backend.repository.CourseRepository;
import com.ttcs.backend.repository.LessonRepository;
import com.ttcs.backend.repository.QuestionRepository;
import com.ttcs.backend.repository.SubmissionRepository;
import com.ttcs.backend.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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

    public AssignmentService(AssignmentRepository assignmentRepository, CourseRepository courseRepository, LessonRepository lessonRepository, UserRepository userRepository, QuestionRepository questionRepository, SubmissionRepository submissionRepository, AssignmentMapper assignmentMapper, QuestionMapper questionMapper, SubmissionMapper submissionMapper) {
        this.assignmentRepository = assignmentRepository;
        this.courseRepository = courseRepository;
        this.lessonRepository = lessonRepository;
        this.userRepository = userRepository;
        this.questionRepository = questionRepository;
        this.submissionRepository = submissionRepository;
        this.assignmentMapper = assignmentMapper;
        this.questionMapper = questionMapper;
        this.submissionMapper = submissionMapper;
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
        Assignment assignment = assignmentMapper.toEntity(request);
        assignment.setCourse(findCourseById(request.getCourseId()));
        if (request.getLessonId() != null) {
            assignment.setLesson(findLessonById(request.getLessonId()));
        }
        assignment.setCreatedBy(findUserById(request.getCreatedById()));
        return assignmentMapper.toResponse(assignmentRepository.save(assignment));
    }

    public AssignmentResponse createForCourse(Long courseId, CreateAssignmentRequest request) {
        request.setCourseId(courseId);
        return create(request);
    }

    public AssignmentResponse update(Long id, CreateAssignmentRequest request) {
        Assignment assignment = findAssignmentEntityById(id);
        assignment.setLesson(request.getLessonId() != null ? findLessonById(request.getLessonId()) : null);
        assignment.setCourse(findCourseById(request.getCourseId()));
        assignment.setTitle(request.getTitle());
        assignment.setDescription(request.getDescription());
        assignment.setType(request.getType());
        assignment.setDueDate(request.getDueDate());
        assignment.setAllowLate(request.getAllowLate());
        assignment.setMaxScore(request.getMaxScore());
        assignment.setWeight(request.getWeight());
        assignment.setTimeLimitMins(request.getTimeLimitMins());
        assignment.setShuffleQuestions(request.getShuffleQuestions());
        assignment.setShuffleOptions(request.getShuffleOptions());
        assignment.setCreatedBy(findUserById(request.getCreatedById()));
        return assignmentMapper.toResponse(assignmentRepository.save(assignment));
    }

    public void delete(Long id) {
        assignmentRepository.delete(findAssignmentEntityById(id));
    }

    public QuestionResponse addQuestion(Long assignmentId, CreateQuestionRequest request) {
        Assignment assignment = findAssignmentEntityById(assignmentId);
        Question question = questionMapper.toEntity(request);
        question.setAssignment(assignment);
        return questionMapper.toResponse(questionRepository.save(question));
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> findSubmissions(Long assignmentId) {
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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Submission not found for this user"));
        return submissionMapper.toResponse(submission);
    }

    private Assignment findAssignmentEntityById(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignment not found: " + id));
    }

    private Course findCourseById(Long id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found: " + id));
    }

    private Lesson findLessonById(Long id) {
        return lessonRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson not found: " + id));
    }

    private User findUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id));
    }
}
