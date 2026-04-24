package com.ttcs.backend.dto.request;

import com.ttcs.backend.enums.AssignmentType;
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
    private String title;
    private String description;
    private AssignmentType type;
    private LocalDateTime dueDate;
    private Boolean allowLate;
    private BigDecimal maxScore;
    private BigDecimal weight;
    private Integer timeLimitMins;
    private Boolean shuffleQuestions;
    private Boolean shuffleOptions;
    private UUID createdById;
}
