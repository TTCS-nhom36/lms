package com.ttcs.backend.dto.response.stats;

public record LessonCompletionStatResponse(
		Long lessonId,
		String lessonTitle,
		long completedCount,
		long activeStudents,
		double completionRate
) {
}