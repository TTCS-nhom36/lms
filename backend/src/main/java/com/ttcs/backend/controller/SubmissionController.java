package com.ttcs.backend.controller;

import com.ttcs.backend.dto.request.GradeSubmissionRequest;
import com.ttcs.backend.dto.response.SubmissionResponse;
import com.ttcs.backend.service.SubmissionService;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SubmissionController {

    private final SubmissionService submissionService;

    public SubmissionController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @PutMapping("/api/lms/submissions/{id}/grade")
    public ResponseEntity<SubmissionResponse> grade(@PathVariable Long id, @RequestHeader("X-User-Id") UUID gradedById, @RequestBody GradeSubmissionRequest request) {
        return ResponseEntity.ok(submissionService.grade(id, request, gradedById));
    }
}
