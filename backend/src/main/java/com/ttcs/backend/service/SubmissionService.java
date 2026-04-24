package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.GradeSubmissionRequest;
import com.ttcs.backend.dto.request.SubmitRequest;
import com.ttcs.backend.dto.response.SubmissionResponse;
import com.ttcs.backend.entity.Assignment;
import com.ttcs.backend.entity.Submission;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.mapper.SubmissionMapper;
import com.ttcs.backend.repository.AssignmentRepository;
import com.ttcs.backend.repository.SubmissionRepository;
import com.ttcs.backend.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final AssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final SubmissionMapper submissionMapper;

    public SubmissionService(SubmissionRepository submissionRepository, AssignmentRepository assignmentRepository, UserRepository userRepository, SubmissionMapper submissionMapper) {
        this.submissionRepository = submissionRepository;
        this.assignmentRepository = assignmentRepository;
        this.userRepository = userRepository;
        this.submissionMapper = submissionMapper;
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
        return submissionMapper.toResponse(submissionRepository.save(submission));
    }

    public SubmissionResponse update(Long id, SubmitRequest request) {
        Submission submission = findSubmissionEntityById(id);
        submission.setAssignment(findAssignmentById(request.getAssignmentId()));
        submission.setUser(findUserById(request.getUserId()));
        submission.setIsLate(request.getIsLate());
        submission.setFileUrl(request.getFileUrl());
        submission.setLinkUrl(request.getLinkUrl());
        return submissionMapper.toResponse(submissionRepository.save(submission));
    }

    public void delete(Long id) {
        submissionRepository.delete(findSubmissionEntityById(id));
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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Submission not found: " + id));
    }

    private Assignment findAssignmentById(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignment not found: " + id));
    }

    private User findUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id));
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
