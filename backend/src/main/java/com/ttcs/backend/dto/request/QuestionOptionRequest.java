package com.ttcs.backend.dto.request;

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
    private String content;
    private Boolean isCorrect;
    private Integer orderIndex;
}
