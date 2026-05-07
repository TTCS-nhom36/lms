package com.ttcs.backend.dto.response.stats;

public record CourseOverviewResponse(
		Long courseId,
		String courseTitle,
		long activeStudents,
		long totalLessons,
		long totalAssignments,
		long completedLessons,
		long submittedAssignments,
		double lessonCompletionRate,
		double submissionRate,
		double averageScore,
		long averageWatchDurationSecs,
		double activeViewerRate
) {
}