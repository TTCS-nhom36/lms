package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.QuestionOptionRequest;
import com.ttcs.backend.dto.response.QuestionOptionResponse;
import com.ttcs.backend.entity.Question;
import com.ttcs.backend.entity.QuestionOption;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.mapper.QuestionOptionMapper;
import com.ttcs.backend.repository.QuestionOptionRepository;
import com.ttcs.backend.repository.QuestionRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class QuestionOptionService {

    private final QuestionOptionRepository questionOptionRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionMapper questionOptionMapper;
    private final CurrentUserService currentUserService;

    public QuestionOptionService(QuestionOptionRepository questionOptionRepository, QuestionRepository questionRepository, QuestionOptionMapper questionOptionMapper, CurrentUserService currentUserService) {
        this.questionOptionRepository = questionOptionRepository;
        this.questionRepository = questionRepository;
        this.questionOptionMapper = questionOptionMapper;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<QuestionOptionResponse> findAll() {
        return questionOptionRepository.findAll().stream().map(questionOptionMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public QuestionOptionResponse findById(Long id) {
        return questionOptionMapper.toResponse(findQuestionOptionEntityById(id));
    }

    public QuestionOptionResponse create(QuestionOptionRequest request) {
        QuestionOption questionOption = questionOptionMapper.toEntity(request);
        Question question = findQuestionById(request.getQuestionId());
        assertCanManageQuestion(question);
        questionOption.setQuestion(question);
        return questionOptionMapper.toResponse(questionOptionRepository.save(questionOption));
    }

    public QuestionOptionResponse update(Long id, QuestionOptionRequest request) {
        QuestionOption questionOption = findQuestionOptionEntityById(id);
        assertCanManageQuestion(questionOption.getQuestion());
        Question question = findQuestionById(request.getQuestionId());
        assertCanManageQuestion(question);
        questionOption.setQuestion(question);
        questionOption.setContent(request.getContent());
        questionOption.setIsCorrect(request.getIsCorrect());
        questionOption.setOrderIndex(request.getOrderIndex());
        return questionOptionMapper.toResponse(questionOptionRepository.save(questionOption));
    }

    public void delete(Long id) {
        QuestionOption questionOption = findQuestionOptionEntityById(id);
        assertCanManageQuestion(questionOption.getQuestion());
        questionOptionRepository.delete(questionOption);
    }

    private QuestionOption findQuestionOptionEntityById(Long id) {
        return questionOptionRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "QuestionOption not found: " + id));
    }

    private Question findQuestionById(Long id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Question not found: " + id));
    }

    private void assertCanManageQuestion(Question question) {
        if (question == null || question.getAssignment() == null || question.getAssignment().getCourse() == null) {
            throw new AppException(ErrorCode.NOT_FOUND, "Question not found");
        }
        if (currentUserService.hasRole("ADMIN")) {
            return;
        }
        java.util.UUID currentUserId = currentUserService.getCurrentUserId();
        if (question.getAssignment().getCourse().getCreatedBy() != null
                && currentUserId.equals(question.getAssignment().getCourse().getCreatedBy().getId())) {
            return;
        }
        throw new AppException(ErrorCode.ACCESS_DENIED, "You are not allowed to manage this question option");
    }
}
