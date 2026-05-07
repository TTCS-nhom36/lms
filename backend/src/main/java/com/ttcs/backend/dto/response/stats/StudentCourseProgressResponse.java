package com.ttcs.backend.dto.response.stats;

public record StudentCourseProgressResponse(
		Long courseId,
		String courseTitle,
		long completedLessons,
		long totalLessons,
		long submittedAssignments,
		long totalAssignments,
		double progressRate,
		double averageScore
) {
}