package com.ttcs.backend.mapper;

import com.ttcs.backend.dto.request.QuestionOptionRequest;
import com.ttcs.backend.dto.response.QuestionOptionResponse;
import com.ttcs.backend.entity.Question;
import com.ttcs.backend.entity.QuestionOption;
import org.springframework.stereotype.Component;

@Component
public class QuestionOptionMapper {

    public QuestionOptionResponse toResponse(QuestionOption questionOption) {
        return toResponse(questionOption, true);
    }

    public QuestionOptionResponse toResponseWithoutCorrectAnswer(QuestionOption questionOption) {
        return toResponse(questionOption, false);
    }

    private QuestionOptionResponse toResponse(QuestionOption questionOption, boolean includeCorrectAnswer) {
        if (questionOption == null) {
            return null;
        }

        return QuestionOptionResponse.builder()
                .id(questionOption.getId())
                .questionId(questionOption.getQuestion() != null ? questionOption.getQuestion().getId() : null)
                .content(questionOption.getContent())
                .isCorrect(includeCorrectAnswer ? questionOption.getIsCorrect() : null)
                .orderIndex(questionOption.getOrderIndex())
                .build();
    }

    public QuestionOption toEntity(QuestionOptionRequest request) {
        if (request == null) {
            return null;
        }

        return QuestionOption.builder()
                .question(mapQuestionById(request.getQuestionId()))
                .content(request.getContent())
                .isCorrect(request.getIsCorrect())
                .orderIndex(request.getOrderIndex())
                .build();
    }

    private Question mapQuestionById(Long id) {
        if (id == null) {
            return null;
        }
        Question question = new Question();
        question.setId(id);
        return question;
    }
}
