package com.ttcs.backend.controller;

import com.ttcs.backend.dto.request.GradeSubmissionRequest;
import com.ttcs.backend.dto.response.SubmissionResponse;
import com.ttcs.backend.service.CurrentUserService;
import com.ttcs.backend.service.SubmissionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SubmissionController {

    private final SubmissionService submissionService;
    private final CurrentUserService currentUserService;

    public SubmissionController(SubmissionService submissionService, CurrentUserService currentUserService) {
        this.submissionService = submissionService;
        this.currentUserService = currentUserService;
    }

    @PutMapping("/api/lms/submissions/{id}/grade")
    public ResponseEntity<SubmissionResponse> grade(@PathVariable Long id, @RequestBody GradeSubmissionRequest request) {
        var gradedById = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(submissionService.grade(id, request, gradedById));
    }
}
