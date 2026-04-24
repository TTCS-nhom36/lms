package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.CreateQuestionRequest;
import com.ttcs.backend.dto.response.QuestionResponse;
import com.ttcs.backend.entity.Assignment;
import com.ttcs.backend.entity.Question;
import com.ttcs.backend.mapper.QuestionMapper;
import com.ttcs.backend.repository.AssignmentRepository;
import com.ttcs.backend.repository.QuestionRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final AssignmentRepository assignmentRepository;
    private final QuestionMapper questionMapper;

    public QuestionService(QuestionRepository questionRepository, AssignmentRepository assignmentRepository, QuestionMapper questionMapper) {
        this.questionRepository = questionRepository;
        this.assignmentRepository = assignmentRepository;
        this.questionMapper = questionMapper;
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
        question.setAssignment(findAssignmentById(request.getAssignmentId()));
        question.setContent(request.getContent());
        question.setType(request.getType());
        question.setOrderIndex(request.getOrderIndex());
        question.setScore(request.getScore());
        return questionMapper.toResponse(questionRepository.save(question));
    }

    public void delete(Long id) {
        questionRepository.delete(findQuestionEntityById(id));
    }

    private Question findQuestionEntityById(Long id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Question not found: " + id));
    }

    private Assignment findAssignmentById(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignment not found: " + id));
    }
}
