package com.ttcs.backend.dto.response;

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
public class SelectedAnswerResponse {

    private Long questionId;
    private Long selectedOptionId;
    private Boolean isCorrect;
}
