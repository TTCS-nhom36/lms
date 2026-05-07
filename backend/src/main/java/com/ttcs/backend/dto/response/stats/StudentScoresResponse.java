package com.ttcs.backend.dto.response.stats;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record StudentScoresResponse(
		UUID studentId,
		String fullName,
		String email,
		BigDecimal averageScore,
		List<StudentScoreItemResponse> items
) {
}