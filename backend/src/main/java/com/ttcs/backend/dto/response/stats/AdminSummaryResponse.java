package com.ttcs.backend.dto.response.stats;

public record AdminSummaryResponse(
		long totalUsers,
		long activeUsers,
		long students,
		long instructors,
		long totalCourses,
		long publishedCourses,
		long draftCourses,
		long totalEnrollments,
		long totalAssignments,
		long totalSubmissions,
		double averageScore,
		double averageCompletionRate
) {
}