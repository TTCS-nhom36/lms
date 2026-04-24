package com.ttcs.backend.mapper;

import com.ttcs.backend.dto.request.CreateQuestionRequest;
import com.ttcs.backend.dto.response.QuestionResponse;
import com.ttcs.backend.entity.Assignment;
import com.ttcs.backend.entity.Question;
import org.springframework.stereotype.Component;

@Component
public class QuestionMapper {

    public QuestionResponse toResponse(Question question) {
        if (question == null) {
            return null;
        }

        return QuestionResponse.builder()
                .id(question.getId())
                .assignmentId(question.getAssignment() != null ? question.getAssignment().getId() : null)
                .content(question.getContent())
                .type(question.getType())
                .orderIndex(question.getOrderIndex())
                .score(question.getScore())
                .build();
    }

    public Question toEntity(CreateQuestionRequest request) {
        if (request == null) {
            return null;
        }

        return Question.builder()
                .assignment(mapAssignmentById(request.getAssignmentId()))
                .content(request.getContent())
                .type(request.getType())
                .orderIndex(request.getOrderIndex())
                .score(request.getScore())
                .build();
    }

    private Assignment mapAssignmentById(Long id) {
        if (id == null) {
            return null;
        }
        Assignment assignment = new Assignment();
        assignment.setId(id);
        return assignment;
    }
}
