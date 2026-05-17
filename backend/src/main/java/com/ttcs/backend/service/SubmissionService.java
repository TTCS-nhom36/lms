package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.GradeSubmissionRequest;
import com.ttcs.backend.dto.request.SubmitRequest;
import com.ttcs.backend.dto.response.SubmissionResponse;
import com.ttcs.backend.entity.Assignment;
import com.ttcs.backend.entity.QuizAttempt;
import com.ttcs.backend.entity.Submission;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.enums.EnrollmentStatus;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.mapper.SubmissionMapper;
import com.ttcs.backend.repository.AssignmentRepository;
import com.ttcs.backend.repository.EnrollmentRepository;
import com.ttcs.backend.repository.QuizAttemptRepository;
import com.ttcs.backend.repository.SubmissionRepository;
import com.ttcs.backend.repository.UserRepository;
import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class SubmissionService {

    private static final long MAX_SUBMISSION_FILE_SIZE = 50 * 1024 * 1024L; // 50 MB

    private final SubmissionRepository submissionRepository;
    private final AssignmentRepository assignmentRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final SubmissionMapper submissionMapper;
    private final S3Service s3Service;
    private final CurrentUserService currentUserService;

    public SubmissionService(SubmissionRepository submissionRepository, AssignmentRepository assignmentRepository, QuizAttemptRepository quizAttemptRepository, UserRepository userRepository, EnrollmentRepository enrollmentRepository, SubmissionMapper submissionMapper, S3Service s3Service, CurrentUserService currentUserService) {
        this.submissionRepository = submissionRepository;
        this.assignmentRepository = assignmentRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.userRepository = userRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.submissionMapper = submissionMapper;
        this.s3Service = s3Service;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> findAll() {
        return submissionRepository.findAll().stream().map(submissionMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public SubmissionResponse findById(Long id) {
        return submissionMapper.toResponse(findSubmissionEntityById(id));
    }

    @Transactional(readOnly = true)
    public SubmissionResponse findManagedById(Long id) {
        Submission submission = findSubmissionEntityById(id);
        assertCanManageAssignment(submission.getAssignment());
        return submissionMapper.toResponse(submission);
    }

    public SubmissionResponse createManaged(SubmitRequest request) {
        Assignment assignment = findAssignmentById(request.getAssignmentId());
        assertCanManageAssignment(assignment);
        return createForAssignment(request, assignment);
    }

    public SubmissionResponse create(SubmitRequest request) {
        Assignment assignment = findAssignmentById(request.getAssignmentId());
        assertCanSubmitAssignment(assignment, request.getUserId());
        return createForAssignment(request, assignment);
    }

    private SubmissionResponse createForAssignment(SubmitRequest request, Assignment assignment) {
        User user = findUserById(request.getUserId());

        List<Submission> existing = submissionRepository
                .findByUserIdAndAssignmentId(request.getUserId(), request.getAssignmentId());
        if (!existing.isEmpty()) {
            submissionRepository.deleteAll(existing);
            submissionRepository.flush();
        }

        Submission submission = submissionMapper.toEntity(request);
        submission.setAssignment(assignment);
        submission.setUser(user);

        if (assignment.getType() == com.ttcs.backend.enums.AssignmentType.QUIZ) {
            QuizAttempt quizAttempt = quizAttemptRepository.findByUserIdAndAssignmentId(request.getUserId(), request.getAssignmentId())
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND,
                            "Quiz attempt not found for user " + request.getUserId() + " and assignment " + request.getAssignmentId()));
            submission.setQuizAttempt(quizAttempt);
        }

        BigDecimal newScore = request.getAutoScore();
        if (newScore != null) {
            submission.setAutoScore(newScore);
        }
        submission.setManualScore(request.getManualScore());
        submission.setFeedback(request.getFeedback());
        submission.setFinalScore(request.getFinalScore() != null ? request.getFinalScore() : resolveFinalScore(submission));
        return submissionMapper.toResponse(submissionRepository.save(submission));
    }

    public SubmissionResponse update(Long id, SubmitRequest request) {
        Submission submission = findSubmissionEntityById(id);
        assertCanManageAssignment(submission.getAssignment());
        Assignment assignment = findAssignmentById(request.getAssignmentId());
        assertCanManageAssignment(assignment);
        submission.setAssignment(assignment);
        submission.setUser(findUserById(request.getUserId()));
        submission.setIsLate(request.getIsLate());
        submission.setFileUrl(request.getFileUrl());
        submission.setLinkUrl(request.getLinkUrl());
        submission.setAutoScore(request.getAutoScore());
        submission.setManualScore(request.getManualScore());
        submission.setFeedback(request.getFeedback());
        submission.setFinalScore(request.getFinalScore() != null ? request.getFinalScore() : resolveFinalScore(submission));
        return submissionMapper.toResponse(submissionRepository.save(submission));
    }

    public void delete(Long id) {
        Submission submission = findSubmissionEntityById(id);
        assertCanManageAssignment(submission.getAssignment());
        submissionRepository.delete(submission);
    }

    public void deleteMySubmission(Long assignmentId, UUID userId) {
        assertActiveEnrollment(findAssignmentById(assignmentId), userId);
        List<Submission> submissions = submissionRepository.findByUserIdAndAssignmentId(userId, assignmentId);
        if (submissions.isEmpty()) {
            throw new AppException(ErrorCode.NOT_FOUND, "Submission not found for this user");
        }
        submissionRepository.deleteAll(submissions);
    }

    /**
     * Upload a submission file to S3 (any type, max 50 MB).
     *
     * @param file the file to upload
     * @return presigned download URL (valid 1h) — used as fileUrl in the submission
     */
    public String uploadSubmissionFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "No file provided");
        }
        if (file.getSize() > MAX_SUBMISSION_FILE_SIZE) {
            throw new AppException(ErrorCode.BAD_REQUEST, "File size must not exceed 50 MB");
        }
        String s3Key = s3Service.uploadFile(file, "submissions");
        // Return the S3 key so the client can store it and request a presigned URL later
        return s3Key;
    }

    /**
     * Get a presigned download URL for a submission file (valid 1h).
     */
    @Transactional(readOnly = true)
    public String getSubmissionFileUrl(Long submissionId) {
        Submission submission = findSubmissionEntityById(submissionId);
        assertCanAccessSubmission(submission);
        String key = submission.getFileUrl();
        if (key == null || key.isBlank()) {
            throw new AppException(ErrorCode.NOT_FOUND, "No file attached to this submission");
        }
        return s3Service.getPresignedUrl(key);
    }

    public SubmissionResponse grade(Long id, GradeSubmissionRequest request, UUID gradedById) {
        Submission submission = findSubmissionEntityById(id);
        assertCanManageAssignment(submission.getAssignment());
        submission.setManualScore(request.getManualScore());
        submission.setFeedback(request.getFeedback());
        submission.setGradedBy(findUserById(gradedById));
        submission.setGradedAt(LocalDateTime.now());
        submission.setFinalScore(request.getFinalScore() != null ? request.getFinalScore() : resolveFinalScore(submission));
        return submissionMapper.toResponse(submissionRepository.save(submission));
    }

    private Submission findSubmissionEntityById(Long id) {
        return submissionRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Submission not found: " + id));
    }

    private Assignment findAssignmentById(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Assignment not found: " + id));
    }

    private User findUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found: " + id));
    }

    private BigDecimal resolveFinalScore(Submission submission) {
        if (submission.getManualScore() != null) {
            return submission.getManualScore();
        }
        if (submission.getAutoScore() != null) {
            return submission.getAutoScore();
        }
        return BigDecimal.ZERO;
    }

    private void assertCanManageAssignment(Assignment assignment) {
        if (assignment == null || assignment.getCourse() == null) {
            throw new AppException(ErrorCode.NOT_FOUND, "Assignment not found");
        }
        if (currentUserService.hasRole("ADMIN")) {
            return;
        }
        UUID currentUserId = currentUserService.getCurrentUserId();
        if (assignment.getCourse().getCreatedBy() != null && currentUserId.equals(assignment.getCourse().getCreatedBy().getId())) {
            return;
        }
        throw new AppException(ErrorCode.ACCESS_DENIED, "You are not allowed to manage this submission");
    }

    private void assertCanSubmitAssignment(Assignment assignment, UUID userId) {
        assertActiveEnrollment(assignment, userId);
        if (Boolean.FALSE.equals(assignment.getAllowLate())
                && assignment.getDueDate() != null
                && LocalDateTime.now().isAfter(assignment.getDueDate())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Assignment no longer accepts submissions");
        }
    }

    private void assertActiveEnrollment(Assignment assignment, UUID userId) {
        if (assignment == null || assignment.getCourse() == null || userId == null) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Assignment requires enrollment");
        }
        boolean enrolled = assignment.getCourse().getId() != null
                && currentUserService.getCurrentUserId().equals(userId)
                && currentUserService.hasRole("STUDENT")
                && enrollmentRepository.findByUserId(userId).stream()
                        .anyMatch(enrollment -> enrollment.getUser() != null
                                && userId.equals(enrollment.getUser().getId())
                                && enrollment.getCourse() != null
                                && assignment.getCourse().getId().equals(enrollment.getCourse().getId())
                                && enrollment.getStatus() == EnrollmentStatus.ACTIVE);
        if (!enrolled) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Assignment requires active enrollment");
        }
    }

    private void assertCanAccessSubmission(Submission submission) {
        UUID currentUserId = currentUserService.getCurrentUserId();
        if (submission.getUser() != null && currentUserId.equals(submission.getUser().getId())) {
            return;
        }
        assertCanManageAssignment(submission.getAssignment());
    }
}
