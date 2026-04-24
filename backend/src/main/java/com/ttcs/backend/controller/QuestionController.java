package com.ttcs.backend.controller;

import com.ttcs.backend.dto.request.CreateQuestionRequest;
import com.ttcs.backend.dto.response.QuestionResponse;
import com.ttcs.backend.service.QuestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class QuestionController {

    private final QuestionService questionService;

    public QuestionController(QuestionService questionService) {
        this.questionService = questionService;
    }

    @PutMapping("/api/lms/questions/{id}")
    public ResponseEntity<QuestionResponse> update(@PathVariable Long id, @RequestBody CreateQuestionRequest request) {
        return ResponseEntity.ok(questionService.update(id, request));
    }

    @DeleteMapping("/api/lms/questions/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        questionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
