package com.ttcs.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
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
public class GradeSubmissionRequest {

	@DecimalMin(value = "0.0", message = "manualScore must not be negative")
	private BigDecimal manualScore;
	@DecimalMin(value = "0.0", message = "finalScore must not be negative")
	private BigDecimal finalScore;
	private String feedback;
}
