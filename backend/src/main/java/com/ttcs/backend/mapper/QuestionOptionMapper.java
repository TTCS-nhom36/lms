package com.ttcs.backend.mapper;

import com.ttcs.backend.dto.request.QuestionOptionRequest;
import com.ttcs.backend.dto.response.QuestionOptionResponse;
import com.ttcs.backend.entity.Question;
import com.ttcs.backend.entity.QuestionOption;
import org.springframework.stereotype.Component;

@Component
public class QuestionOptionMapper {

    public QuestionOptionResponse toResponse(QuestionOption questionOption) {
        if (questionOption == null) {
            return null;
        }

        return QuestionOptionResponse.builder()
                .id(questionOption.getId())
                .questionId(questionOption.getQuestion() != null ? questionOption.getQuestion().getId() : null)
                .content(questionOption.getContent())
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
