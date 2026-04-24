package com.ttcs.backend.dto.response;

import com.ttcs.backend.enums.EnrollmentStatus;
import java.math.BigDecimal;
import java.util.UUID;

public record GradebookEntryResponse(
		UUID userId,
		String fullName,
		String email,
		EnrollmentStatus enrollmentStatus,
		long totalAssignments,
		long submittedAssignments,
		BigDecimal averageScore
) {
}