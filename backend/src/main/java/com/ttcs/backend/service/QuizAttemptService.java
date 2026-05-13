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
import com.ttcs.backend.repository.EnrollmentRepository;
import com.ttcs.backend.repository.QuestionOptionRepository;
import com.ttcs.backend.repository.QuestionRepository;
import com.ttcs.backend.repository.QuizAttemptRepository;
import com.ttcs.backend.repository.SelectedAnswerRepository;
import com.ttcs.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
    private final EnrollmentRepository enrollmentRepository;
    private final CurrentUserService currentUserService;
    //
//
    public QuizAttemptService(
            QuizAttemptRepository quizAttemptRepository,
            SelectedAnswerRepository selectedAnswerRepository,
            AssignmentRepository assignmentRepository,
            UserRepository userRepository,
            QuestionRepository questionRepository,
            QuestionOptionRepository questionOptionRepository,
            //QuizAttemptMapper quizAttemptMapper) {
            QuizAttemptMapper quizAttemptMapper,
            EnrollmentRepository enrollmentRepository,
            CurrentUserService currentUserService) {
        this.quizAttemptRepository = quizAttemptRepository;
        this.selectedAnswerRepository = selectedAnswerRepository;
        this.assignmentRepository = assignmentRepository;
        this.userRepository = userRepository;
        this.questionRepository = questionRepository;
        this.questionOptionRepository = questionOptionRepository;
        this.quizAttemptMapper = quizAttemptMapper;
        this.enrollmentRepository = enrollmentRepository;
        this.currentUserService = currentUserService;
        //
    }

    public QuizAttemptResponse createAttempt(CreateAttemptRequest request) {
        if (request.getAssignmentId() == null || request.getUserId() == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "assignmentId and userId must not be null");
        }
        Assignment assignment = assignmentRepository.findById(request.getAssignmentId())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Assignment not found: " + request.getAssignmentId()));
        assertStudentCanAccessAssignment(assignment, request.getUserId());

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found: " + request.getUserId()));

        quizAttemptRepository.findByUserIdAndAssignmentId(request.getUserId(), request.getAssignmentId())
                .ifPresent(existing -> {
                    throw new AppException(ErrorCode.BAD_REQUEST, "This quiz can only be attempted once");
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
        assertAttemptVisibleToCurrentUser(attempt, request.getStudentId());

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

        ScoreSummary scoreSummary = calculateScoreSummary(attempt.getAssignment().getId(), savedAnswers);

        return SubmitQuizResponse.builder()
                .attemptId(attempt.getId())
                .userId(attempt.getUser().getId())
                .assignmentId(attempt.getAssignment().getId())
                .totalQuestions(scoreSummary.totalQuestions())
                .correctAnswers(scoreSummary.correctQuestions())
                .totalScore(scoreSummary.totalScore().doubleValue())
                .maxScore(scoreSummary.maxScore().doubleValue())
                .scorePercentage(scoreSummary.scorePercentage())
                .answers(answerResponses)
                .submittedAt(attempt.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public SubmitQuizResponse getAttemptResult(Long attemptId) {
        return getAttemptResult(attemptId, currentUserService.getCurrentUserId());
    }

    @Transactional(readOnly = true)
    public SubmitQuizResponse getMyAttempt(Long assignmentId, UUID userId) {
        QuizAttempt attempt = quizAttemptRepository.findByUserIdAndAssignmentId(userId, assignmentId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "No attempt found for this assignment"));
        
        // Return the result of the attempt
        return getAttemptResult(attempt.getId(), userId);
    }

    @Transactional(readOnly = true)
    public SubmitQuizResponse getAttemptResult(Long attemptId, UUID requesterId) {
        QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Attempt not found: " + attemptId));
        assertAttemptVisibleToCurrentUser(attempt, requesterId);

        List<SelectedAnswer> selectedAnswers = selectedAnswerRepository.findByQuizAttemptId(attemptId);

        List<SelectedAnswerResponse> answerResponses = selectedAnswers.stream()
                .map(quizAttemptMapper::toSelectedAnswerResponse)
                .toList();

        ScoreSummary scoreSummary = calculateScoreSummary(attempt.getAssignment().getId(), selectedAnswers);

        return SubmitQuizResponse.builder()
                .attemptId(attempt.getId())
                .userId(attempt.getUser().getId())
                .assignmentId(attempt.getAssignment().getId())
                .totalQuestions(scoreSummary.totalQuestions())
                .correctAnswers(scoreSummary.correctQuestions())
                .totalScore(scoreSummary.totalScore().doubleValue())
                .maxScore(scoreSummary.maxScore().doubleValue())
                .scorePercentage(scoreSummary.scorePercentage())
                .answers(answerResponses)
                .submittedAt(attempt.getCreatedAt())
                .build();
    }

    private void assertStudentCanAccessAssignment(Assignment assignment, UUID userId) {
        if (assignment == null || assignment.getCourse() == null || userId == null) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Assignment requires enrollment");
        }
        boolean enrolled = enrollmentRepository.findAll().stream()
                .anyMatch(enrollment -> enrollment.getUser() != null
                        && userId.equals(enrollment.getUser().getId())
                        && enrollment.getCourse() != null
                        && assignment.getCourse().getId().equals(enrollment.getCourse().getId()));
        if (!enrolled) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Assignment requires enrollment");
        }
    }

    private void assertAttemptVisibleToCurrentUser(QuizAttempt attempt, UUID requesterId) {
        if (attempt.getUser() != null && requesterId != null && requesterId.equals(attempt.getUser().getId())) {
            return;
        }
        if (currentUserService.hasRole("ADMIN")) {
            return;
        }
        if (currentUserService.hasRole("INSTRUCTOR")
                && attempt.getAssignment() != null
                && attempt.getAssignment().getCourse() != null
                && attempt.getAssignment().getCourse().getCreatedBy() != null
                && requesterId.equals(attempt.getAssignment().getCourse().getCreatedBy().getId())) {
            return;
        }
        throw new AppException(ErrorCode.ACCESS_DENIED, "You are not allowed to view this attempt");
    }

        private ScoreSummary calculateScoreSummary(Long assignmentId, List<SelectedAnswer> selectedAnswers) {
                List<Question> assignmentQuestions = questionRepository.findByAssignmentId(assignmentId);

                Map<Long, Set<Long>> selectedOptionIdsByQuestion = new HashMap<>();
                for (SelectedAnswer answer : selectedAnswers) {
                        if (answer.getQuestion() == null || answer.getSelectedOption() == null) {
                                continue;
                        }
                        Long questionId = answer.getQuestion().getId();
                        selectedOptionIdsByQuestion
                                        .computeIfAbsent(questionId, key -> new HashSet<>())
                                        .add(answer.getSelectedOption().getId());
                }

                BigDecimal totalScore = BigDecimal.ZERO;
                BigDecimal maxScore = BigDecimal.ZERO;
                int correctQuestions = 0;

                for (Question question : assignmentQuestions) {
                        BigDecimal questionScore = question.getScore() != null ? question.getScore() : BigDecimal.ZERO;
                        maxScore = maxScore.add(questionScore);

                        Set<Long> correctOptionIds = question.getOptions().stream()
                                        .filter(option -> Boolean.TRUE.equals(option.getIsCorrect()))
                                        .map(QuestionOption::getId)
                                        .collect(java.util.stream.Collectors.toSet());
                        Set<Long> selectedOptionIds = selectedOptionIdsByQuestion.getOrDefault(question.getId(), java.util.Collections.emptySet());

                        if (!correctOptionIds.isEmpty()
                                        && selectedOptionIds.size() == correctOptionIds.size()
                                        && selectedOptionIds.containsAll(correctOptionIds)) {
                                correctQuestions++;
                                totalScore = totalScore.add(questionScore);
                        }
                }

                // Normalize score to 0-10 scale
                BigDecimal normalizedScore = BigDecimal.ZERO;
                if (maxScore.compareTo(BigDecimal.ZERO) > 0) {
                    normalizedScore = totalScore.divide(maxScore, 4, RoundingMode.HALF_UP).multiply(BigDecimal.TEN);
                    // Cap at 10
                    if (normalizedScore.compareTo(BigDecimal.TEN) > 0) {
                        normalizedScore = BigDecimal.TEN;
                    }
                }
                normalizedScore = normalizedScore.setScale(2, RoundingMode.HALF_UP);

                double scorePercentage = normalizedScore.divide(BigDecimal.TEN, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue();

                return new ScoreSummary(
                                assignmentQuestions.size(),
                                correctQuestions,
                                normalizedScore,
                                BigDecimal.TEN,
                                scorePercentage
                );
        }

        private record ScoreSummary(
                        int totalQuestions,
                        int correctQuestions,
                        BigDecimal totalScore,
                        BigDecimal maxScore,
                        double scorePercentage
        ) {
        }
//
}
