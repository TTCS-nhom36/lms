package com.ttcs.backend.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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
public class QuestionOptionRequest {

    private Long questionId;

    @NotBlank(message = "option content is required")
    private String content;

    private Boolean isCorrect;

    @Min(value = 1, message = "orderIndex must be at least 1")
    private Integer orderIndex;
}
