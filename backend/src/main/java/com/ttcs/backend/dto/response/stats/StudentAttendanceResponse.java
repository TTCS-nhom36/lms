package com.ttcs.backend.dto.response.stats;

import java.time.LocalDateTime;
import java.util.UUID;

public record StudentAttendanceResponse(
		UUID userId,
		String fullName,
		String email,
		long watchDurationSecs,
		long completedLessons,
		long totalLessons,
		double lessonCompletionRate,
		LocalDateTime lastAccessedAt
) {
}