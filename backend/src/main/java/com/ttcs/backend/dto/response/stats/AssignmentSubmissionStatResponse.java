package com.ttcs.backend.dto.response.stats;

import com.ttcs.backend.enums.AssignmentType;

public record AssignmentSubmissionStatResponse(
		Long assignmentId,
		String assignmentTitle,
		AssignmentType assignmentType,
		long submittedCount,
		long activeStudents,
		double submissionRate
) {
}