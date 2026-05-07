package com.ttcs.backend.dto.response.stats;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record StudentScoreItemResponse(
		Long assignmentId,
		String assignmentTitle,
		Long courseId,
		String courseTitle,
		BigDecimal score,
		BigDecimal maxScore,
		double scorePercent,
		LocalDateTime submittedAt,
		LocalDateTime gradedAt,
		Boolean isLate
) {
}