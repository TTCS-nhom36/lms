package com.ttcs.backend.dto.request;

import jakarta.validation.constraints.NotNull;
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
public class AnswerRequest {

    @NotNull(message = "questionId is required")
    private Long questionId;

    @NotNull(message = "selectedAnswerId is required")
    private Long selectedAnswerId;
}
