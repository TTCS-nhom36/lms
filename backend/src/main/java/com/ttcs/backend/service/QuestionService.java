package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.CreateQuestionRequest;
import com.ttcs.backend.dto.response.QuestionResponse;
import com.ttcs.backend.entity.Assignment;
import com.ttcs.backend.entity.Question;
import com.ttcs.backend.entity.QuestionOption;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.mapper.QuestionMapper;
import com.ttcs.backend.mapper.QuestionOptionMapper;
import com.ttcs.backend.repository.AssignmentRepository;
import com.ttcs.backend.repository.QuestionRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final AssignmentRepository assignmentRepository;
    private final QuestionMapper questionMapper;
    private final QuestionOptionMapper questionOptionMapper;

    public QuestionService(QuestionRepository questionRepository, AssignmentRepository assignmentRepository, QuestionMapper questionMapper, QuestionOptionMapper questionOptionMapper) {
        this.questionRepository = questionRepository;
        this.assignmentRepository = assignmentRepository;
        this.questionMapper = questionMapper;
        this.questionOptionMapper = questionOptionMapper;
    }

    @Transactional(readOnly = true)
    public List<QuestionResponse> findAll() {
        return questionRepository.findAll().stream().map(questionMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public QuestionResponse findById(Long id) {
        return questionMapper.toResponse(findQuestionEntityById(id));
    }

    public QuestionResponse create(CreateQuestionRequest request) {
        Question question = questionMapper.toEntity(request);
        question.setAssignment(findAssignmentById(request.getAssignmentId()));
        return questionMapper.toResponse(questionRepository.save(question));
    }

    public QuestionResponse update(Long id, CreateQuestionRequest request) {
        Question question = findQuestionEntityById(id);
        question.setContent(request.getContent());
        question.setType(request.getType());
        question.setOrderIndex(request.getOrderIndex());
        question.setScore(request.getScore());
        // Clear old options first and flush to DB (orphanRemoval), then add new ones
        if (request.getOptions() != null) {
            question.getOptions().clear();
            questionRepository.saveAndFlush(question); // flush delete of old options
            List<QuestionOption> newOptions = new ArrayList<>();
            for (int i = 0; i < request.getOptions().size(); i++) {
                QuestionOption opt = questionOptionMapper.toEntity(request.getOptions().get(i));
                opt.setQuestion(question);
                if (opt.getOrderIndex() == null) opt.setOrderIndex(i + 1);
                newOptions.add(opt);
            }
            question.getOptions().addAll(newOptions);
        }
        return questionMapper.toResponse(questionRepository.save(question));
    }

    public void delete(Long id) {
        questionRepository.delete(findQuestionEntityById(id));
    }

    private Question findQuestionEntityById(Long id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Question not found: " + id));
    }

    private Assignment findAssignmentById(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Assignment not found: " + id));
    }
}
