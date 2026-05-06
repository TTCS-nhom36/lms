package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.GradeSubmissionRequest;
import com.ttcs.backend.dto.request.SubmitRequest;
import com.ttcs.backend.dto.response.SubmissionResponse;
import com.ttcs.backend.entity.Assignment;
import com.ttcs.backend.entity.Submission;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.mapper.SubmissionMapper;
import com.ttcs.backend.repository.AssignmentRepository;
import com.ttcs.backend.repository.SubmissionRepository;
import com.ttcs.backend.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class SubmissionService {

    private static final long MAX_SUBMISSION_FILE_SIZE = 50 * 1024 * 1024L; // 50 MB

    private final SubmissionRepository submissionRepository;
    private final AssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final SubmissionMapper submissionMapper;
    private final S3Service s3Service;

    public SubmissionService(SubmissionRepository submissionRepository, AssignmentRepository assignmentRepository, UserRepository userRepository, SubmissionMapper submissionMapper, S3Service s3Service) {
        this.submissionRepository = submissionRepository;
        this.assignmentRepository = assignmentRepository;
        this.userRepository = userRepository;
        this.submissionMapper = submissionMapper;
        this.s3Service = s3Service;
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> findAll() {
        return submissionRepository.findAll().stream().map(submissionMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public SubmissionResponse findById(Long id) {
        return submissionMapper.toResponse(findSubmissionEntityById(id));
    }

    public SubmissionResponse create(SubmitRequest request) {
        Submission submission = submissionMapper.toEntity(request);
        submission.setAssignment(findAssignmentById(request.getAssignmentId()));
        submission.setUser(findUserById(request.getUserId()));
        if (request.getAutoScore() != null) {
            submission.setAutoScore(request.getAutoScore());
            submission.setFinalScore(request.getAutoScore());
        }
        return submissionMapper.toResponse(submissionRepository.save(submission));
    }

    public SubmissionResponse update(Long id, SubmitRequest request) {
        Submission submission = findSubmissionEntityById(id);
        submission.setAssignment(findAssignmentById(request.getAssignmentId()));
        submission.setUser(findUserById(request.getUserId()));
        submission.setIsLate(request.getIsLate());
        submission.setFileUrl(request.getFileUrl());
        submission.setLinkUrl(request.getLinkUrl());
        if (request.getAutoScore() != null) {
            submission.setAutoScore(request.getAutoScore());
            submission.setFinalScore(request.getAutoScore());
        }
        return submissionMapper.toResponse(submissionRepository.save(submission));
    }

    public void delete(Long id) {
        submissionRepository.delete(findSubmissionEntityById(id));
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
        String key = submission.getFileUrl();
        if (key == null || key.isBlank()) {
            throw new AppException(ErrorCode.NOT_FOUND, "No file attached to this submission");
        }
        return s3Service.getPresignedUrl(key);
    }

    public SubmissionResponse grade(Long id, GradeSubmissionRequest request, UUID gradedById) {
        Submission submission = findSubmissionEntityById(id);
        submission.setManualScore(request.getManualScore());
        submission.setFeedback(request.getFeedback());
        submission.setGradedBy(findUserById(gradedById));
        submission.setGradedAt(LocalDateTime.now());
        submission.setFinalScore(resolveFinalScore(submission));
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
}
