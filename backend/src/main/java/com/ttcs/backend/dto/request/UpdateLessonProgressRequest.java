package com.ttcs.backend.dto.request;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateLessonProgressRequest {

	private Boolean isCompleted;

	@Min(value = 0, message = "watchDurationSecs must not be negative")
	private Integer watchDurationSecs;
}
