package com.ttcs.backend.dto.response;

import com.ttcs.backend.enums.QuestionType;
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
public class QuestionResponse {

    private Long id;
    private Long assignmentId;
    private String content;
    private QuestionType type;
    private Integer orderIndex;
    private BigDecimal score;
}
