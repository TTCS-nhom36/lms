package com.ttcs.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;
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
public class SubmitQuizResponse {

    private Long attemptId;
    private UUID userId;
    private Long assignmentId;
    private int totalQuestions;
    private int correctAnswers;
    private double scorePercentage;
    private List<SelectedAnswerResponse> answers;
    private LocalDateTime submittedAt;
}
