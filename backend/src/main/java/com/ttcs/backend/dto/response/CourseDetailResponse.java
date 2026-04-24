package com.ttcs.backend.dto.response;

import java.util.List;

public record CourseDetailResponse(
		CourseResponse course,
		List<ChapterResponse> chapters
) {
}