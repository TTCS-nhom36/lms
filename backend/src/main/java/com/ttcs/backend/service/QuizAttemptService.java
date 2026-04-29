package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.AnswerRequest;
import com.ttcs.backend.dto.request.CreateAttemptRequest;
import com.ttcs.backend.dto.request.SubmitQuizRequest;
import com.ttcs.backend.dto.response.QuizAttemptResponse;
import com.ttcs.backend.dto.response.SelectedAnswerResponse;
import com.ttcs.backend.dto.response.SubmitQuizResponse;
import com.ttcs.backend.entity.Assignment;
import com.ttcs.backend.entity.Question;
import com.ttcs.backend.entity.QuestionOption;
import com.ttcs.backend.entity.QuizAttempt;
import com.ttcs.backend.entity.SelectedAnswer;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.mapper.QuizAttemptMapper;
import com.ttcs.backend.repository.AssignmentRepository;
import com.ttcs.backend.repository.QuestionOptionRepository;
import com.ttcs.backend.repository.QuestionRepository;
import com.ttcs.backend.repository.QuizAttemptRepository;
import com.ttcs.backend.repository.SelectedAnswerRepository;
import com.ttcs.backend.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class QuizAttemptService {

    private final QuizAttemptRepository quizAttemptRepository;
    private final SelectedAnswerRepository selectedAnswerRepository;
    private final AssignmentRepository assignmentRepository;
    private final UserRepository userRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final QuizAttemptMapper quizAttemptMapper;

    public QuizAttemptService(
            QuizAttemptRepository quizAttemptRepository,
            SelectedAnswerRepository selectedAnswerRepository,
            AssignmentRepository assignmentRepository,
            UserRepository userRepository,
            QuestionRepository questionRepository,
            QuestionOptionRepository questionOptionRepository,
            QuizAttemptMapper quizAttemptMapper) {
        this.quizAttemptRepository = quizAttemptRepository;
        this.selectedAnswerRepository = selectedAnswerRepository;
        this.assignmentRepository = assignmentRepository;
        this.userRepository = userRepository;
        this.questionRepository = questionRepository;
        this.questionOptionRepository = questionOptionRepository;
        this.quizAttemptMapper = quizAttemptMapper;
    }

    public QuizAttemptResponse createAttempt(CreateAttemptRequest request) {
        Assignment assignment = assignmentRepository.findById(request.getAssignmentId())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Assignment not found: " + request.getAssignmentId()));

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found: " + request.getUserId()));

        // Check if attempt already exists for this user + assignment pair
        quizAttemptRepository.findByUserIdAndAssignmentId(request.getUserId(), request.getAssignmentId())
                .ifPresent(existing -> {
                    throw new AppException(ErrorCode.DATA_INTEGRITY_VIOLATION,
                            "User already has an attempt for this assignment");
                });

        QuizAttempt attempt = QuizAttempt.builder()
                .user(user)
                .assignment(assignment)
                .build();

        return quizAttemptMapper.toResponse(quizAttemptRepository.save(attempt));
    }

    public SubmitQuizResponse submitQuiz(SubmitQuizRequest request) {
        // Find or validate the attempt
        QuizAttempt attempt = quizAttemptRepository.findByUserIdAndAssignmentId(
                        request.getStudentId(), request.getQuizId())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND,
                        "No attempt found for user " + request.getStudentId() + " and assignment " + request.getQuizId()));

        // Clear any previous answers for this attempt (in case of re-submit)
        List<SelectedAnswer> existingAnswers = selectedAnswerRepository.findByQuizAttemptId(attempt.getId());
        if (!existingAnswers.isEmpty()) {
            selectedAnswerRepository.deleteAll(existingAnswers);
        }

        // Save each selected answer
        List<SelectedAnswer> savedAnswers = new ArrayList<>();
        for (AnswerRequest answerReq : request.getAnswers()) {
            Question question = questionRepository.findById(answerReq.getQuestionId())
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND,
                            "Question not found: " + answerReq.getQuestionId()));

            QuestionOption selectedOption = questionOptionRepository.findById(answerReq.getSelectedAnswerId())
                    .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND,
                            "Option not found: " + answerReq.getSelectedAnswerId()));

            SelectedAnswer selectedAnswer = SelectedAnswer.builder()
                    .quizAttempt(attempt)
                    .question(question)
                    .selectedOption(selectedOption)
                    .build();

            savedAnswers.add(selectedAnswerRepository.save(selectedAnswer));
        }

        // Calculate score
        List<SelectedAnswerResponse> answerResponses = savedAnswers.stream()
                .map(quizAttemptMapper::toSelectedAnswerResponse)
                .toList();

        int totalQuestions = answerResponses.size();
        int correctAnswers = (int) answerResponses.stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsCorrect()))
                .count();

        double scorePercentage = totalQuestions > 0
                ? (double) correctAnswers / totalQuestions * 100.0
                : 0.0;

        return SubmitQuizResponse.builder()
                .attemptId(attempt.getId())
                .userId(attempt.getUser().getId())
                .assignmentId(attempt.getAssignment().getId())
                .totalQuestions(totalQuestions)
                .correctAnswers(correctAnswers)
                .scorePercentage(scorePercentage)
                .answers(answerResponses)
                .submittedAt(attempt.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public SubmitQuizResponse getAttemptResult(Long attemptId) {
        QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Attempt not found: " + attemptId));

        List<SelectedAnswerResponse> answerResponses = selectedAnswerRepository.findByQuizAttemptId(attemptId)
                .stream()
                .map(quizAttemptMapper::toSelectedAnswerResponse)
                .toList();

        int totalQuestions = answerResponses.size();
        int correctAnswers = (int) answerResponses.stream()
                .filter(a -> Boolean.TRUE.equals(a.getIsCorrect()))
                .count();

        double scorePercentage = totalQuestions > 0
                ? (double) correctAnswers / totalQuestions * 100.0
                : 0.0;

        return SubmitQuizResponse.builder()
                .attemptId(attempt.getId())
                .userId(attempt.getUser().getId())
                .assignmentId(attempt.getAssignment().getId())
                .totalQuestions(totalQuestions)
                .correctAnswers(correctAnswers)
                .scorePercentage(scorePercentage)
                .answers(answerResponses)
                .submittedAt(attempt.getCreatedAt())
                .build();
    }
}
