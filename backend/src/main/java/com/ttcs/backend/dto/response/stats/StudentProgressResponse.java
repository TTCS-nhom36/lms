package com.ttcs.backend.dto.response.stats;

import java.util.List;
import java.util.UUID;

public record StudentProgressResponse(
		UUID studentId,
		String fullName,
		String email,
		long totalCourses,
		long completedCourses,
		double overallProgress,
		List<StudentCourseProgressResponse> courses
) {
}