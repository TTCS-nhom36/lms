package com.ttcs.backend.dto.request;

import com.ttcs.backend.enums.AssignmentType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;
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
public class CreateAssignmentRequest {

    private Long lessonId;

    private Long courseId;

    @NotBlank(message = "title is required")
    private String title;

    private String description;

    @NotNull(message = "type is required")
    private AssignmentType type;

    private LocalDateTime dueDate;
    private Boolean allowLate;

    @DecimalMin(value = "0.0", inclusive = false, message = "maxScore must be greater than 0")
    private BigDecimal maxScore;

    @DecimalMin(value = "0.0", message = "weight must not be negative")
    private BigDecimal weight;

    @Min(value = 1, message = "timeLimitMins must be at least 1")
    private Integer timeLimitMins;
    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;
    private UUID createdById;
}
