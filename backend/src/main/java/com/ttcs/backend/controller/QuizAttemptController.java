package com.ttcs.backend.controller;

import com.ttcs.backend.dto.request.CreateAttemptRequest;
import com.ttcs.backend.dto.request.SubmitQuizRequest;
import com.ttcs.backend.dto.response.QuizAttemptResponse;
import com.ttcs.backend.dto.response.SubmitQuizResponse;
import com.ttcs.backend.service.QuizAttemptService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/lms/quiz-attempts")
public class QuizAttemptController {

    private final QuizAttemptService quizAttemptService;

    public QuizAttemptController(QuizAttemptService quizAttemptService) {
        this.quizAttemptService = quizAttemptService;
    }

    @PostMapping
    public ResponseEntity<QuizAttemptResponse> createAttempt(@RequestBody CreateAttemptRequest request) {
        return ResponseEntity.ok(quizAttemptService.createAttempt(request));
    }

    @PostMapping("/submit")
    public ResponseEntity<SubmitQuizResponse> submitQuiz(@RequestBody SubmitQuizRequest request) {
        return ResponseEntity.ok(quizAttemptService.submitQuiz(request));
    }

    @GetMapping("/{id}/result")
    public ResponseEntity<SubmitQuizResponse> getAttemptResult(@PathVariable Long id) {
        return ResponseEntity.ok(quizAttemptService.getAttemptResult(id));
    }
}
