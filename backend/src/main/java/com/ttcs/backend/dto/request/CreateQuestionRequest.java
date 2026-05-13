package com.ttcs.backend.dto.request;

import com.ttcs.backend.enums.QuestionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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
public class CreateQuestionRequest {

    private Long assignmentId;

    @NotBlank(message = "content is required")
    private String content;

    private QuestionType type;

    @Min(value = 1, message = "orderIndex must be at least 1")
    private Integer orderIndex;

    @DecimalMin(value = "0.0", inclusive = false, message = "score must be greater than 0")
    private BigDecimal score;

    @Valid
    private java.util.List<QuestionOptionRequest> options;
}
