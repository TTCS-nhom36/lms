package com.ttcs.backend.mapper;

import com.ttcs.backend.dto.request.SubmitRequest;
import com.ttcs.backend.dto.response.SubmissionResponse;
import com.ttcs.backend.entity.Assignment;
import com.ttcs.backend.entity.Submission;
import com.ttcs.backend.entity.User;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class SubmissionMapper {

    public SubmissionResponse toResponse(Submission submission) {
        if (submission == null) {
            return null;
        }

        return SubmissionResponse.builder()
                .id(submission.getId())
                .assignmentId(submission.getAssignment() != null ? submission.getAssignment().getId() : null)
                .userId(submission.getUser() != null ? submission.getUser().getId() : null)
                .submittedAt(submission.getSubmittedAt())
                .isLate(submission.getIsLate())
                .fileUrl(submission.getFileUrl())
                .linkUrl(submission.getLinkUrl())
                .autoScore(submission.getAutoScore())
                .manualScore(submission.getManualScore())
                .finalScore(submission.getFinalScore())
                .feedback(submission.getFeedback())
                .gradedById(submission.getGradedBy() != null ? submission.getGradedBy().getId() : null)
                .gradedAt(submission.getGradedAt())
                .build();
    }

    public Submission toEntity(SubmitRequest request) {
        if (request == null) {
            return null;
        }

        return Submission.builder()
                .assignment(mapAssignmentById(request.getAssignmentId()))
                .user(mapUserById(request.getUserId()))
                .isLate(request.getIsLate())
                .fileUrl(request.getFileUrl())
                .linkUrl(request.getLinkUrl())
                .build();
    }

    private Assignment mapAssignmentById(Long id) {
        if (id == null) {
            return null;
        }
        Assignment assignment = new Assignment();
        assignment.setId(id);
        return assignment;
    }

    private User mapUserById(UUID id) {
        if (id == null) {
            return null;
        }
        User user = new User();
        user.setId(id);
        return user;
    }
}
