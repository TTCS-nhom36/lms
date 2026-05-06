package com.ttcs.backend.dto.response;

import java.util.List;

public record GradebookResponse(
		Long courseId,
		String courseTitle,
		List<GradebookEntryResponse> entries
) {
}