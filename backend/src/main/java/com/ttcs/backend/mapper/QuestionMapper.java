package com.ttcs.backend.mapper;

import com.ttcs.backend.dto.request.CreateQuestionRequest;
import com.ttcs.backend.dto.response.QuestionResponse;
import com.ttcs.backend.entity.Assignment;
import com.ttcs.backend.entity.Question;
import com.ttcs.backend.entity.QuestionOption;
import org.springframework.stereotype.Component;
import java.util.stream.Collectors;
import java.util.List;

@Component
public class QuestionMapper {

    private final QuestionOptionMapper questionOptionMapper;

    public QuestionMapper(QuestionOptionMapper questionOptionMapper) {
        this.questionOptionMapper = questionOptionMapper;
    }

    public QuestionResponse toResponse(Question question) {
        return toResponse(question, true);
    }

    public QuestionResponse toStudentResponse(Question question) {
        return toResponse(question, false);
    }

    private QuestionResponse toResponse(Question question, boolean includeCorrectAnswers) {
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
                //
                .options(question.getOptions() != null ? question.getOptions().stream()
                        .map(option -> includeCorrectAnswers
                                ? questionOptionMapper.toResponse(option)
                                : questionOptionMapper.toResponseWithoutCorrectAnswer(option))
                        .collect(Collectors.toList()) : null)
                //
                .build();
    }

    public Question toEntity(CreateQuestionRequest request) {
        if (request == null) {
            return null;
        }

        Question question = Question.builder()
                .assignment(mapAssignmentById(request.getAssignmentId()))
                .content(request.getContent())
                .type(request.getType())
                .orderIndex(request.getOrderIndex())
                .score(request.getScore())
                .build();
                
        if (request.getOptions() != null) {
            List<QuestionOption> options = request.getOptions().stream().map(optReq -> {
                QuestionOption opt = questionOptionMapper.toEntity(optReq);
                opt.setQuestion(question);
                return opt;
            }).collect(Collectors.toList());
            question.setOptions(options);
        }
        
        return question;
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
