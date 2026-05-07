package com.ttcs.backend.dto.response.stats;

public record ScoreDistributionBucketResponse(
		String label,
		long count,
		double percentage
) {
}