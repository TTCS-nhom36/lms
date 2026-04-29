package com.ttcs.backend.mapper;

import com.ttcs.backend.dto.response.QuizAttemptResponse;
import com.ttcs.backend.dto.response.SelectedAnswerResponse;
import com.ttcs.backend.entity.QuizAttempt;
import com.ttcs.backend.entity.SelectedAnswer;
import org.springframework.stereotype.Component;

@Component
public class QuizAttemptMapper {

    public QuizAttemptResponse toResponse(QuizAttempt attempt) {
        if (attempt == null) {
            return null;
        }

        return QuizAttemptResponse.builder()
                .id(attempt.getId())
                .userId(attempt.getUser() != null ? attempt.getUser().getId() : null)
                .assignmentId(attempt.getAssignment() != null ? attempt.getAssignment().getId() : null)
                .createdAt(attempt.getCreatedAt())
                .build();
    }

    public SelectedAnswerResponse toSelectedAnswerResponse(SelectedAnswer selectedAnswer) {
        if (selectedAnswer == null) {
            return null;
        }

        return SelectedAnswerResponse.builder()
                .questionId(selectedAnswer.getQuestion() != null ? selectedAnswer.getQuestion().getId() : null)
                .selectedOptionId(selectedAnswer.getSelectedOption() != null ? selectedAnswer.getSelectedOption().getId() : null)
                .isCorrect(selectedAnswer.getSelectedOption() != null ? selectedAnswer.getSelectedOption().getIsCorrect() : false)
                .build();
    }
}
