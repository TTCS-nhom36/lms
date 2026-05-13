package com.ttcs.backend.controller;

import com.ttcs.backend.dto.request.CreateAssignmentRequest;
import com.ttcs.backend.dto.request.CreateQuestionRequest;
import com.ttcs.backend.dto.request.SubmitRequest;
import com.ttcs.backend.dto.response.AssignmentResponse;
import com.ttcs.backend.dto.response.QuestionResponse;
import com.ttcs.backend.dto.response.SubmissionResponse;
import com.ttcs.backend.service.AssignmentService;
import com.ttcs.backend.service.CurrentUserService;
import com.ttcs.backend.service.SubmissionService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AssignmentController {

    private final AssignmentService assignmentService;
    private final SubmissionService submissionService;
    private final CurrentUserService currentUserService;

    public AssignmentController(AssignmentService assignmentService, SubmissionService submissionService, CurrentUserService currentUserService) {
        this.assignmentService = assignmentService;
        this.submissionService = submissionService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/api/lms/courses/{courseId}/assignments")
    public ResponseEntity<List<AssignmentResponse>> getByCourse(@PathVariable Long courseId) {
        return ResponseEntity.ok(assignmentService.findByCourseId(courseId));
    }

    @PostMapping("/api/lms/courses/{courseId}/assignments")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<AssignmentResponse> create(@PathVariable Long courseId, @Valid @RequestBody CreateAssignmentRequest request) {
        request.setCreatedById(currentUserService.getCurrentUserId());
        return ResponseEntity.ok(assignmentService.createForCourse(courseId, request));
    }

    @GetMapping("/api/lms/assignments/{id}")
    public ResponseEntity<AssignmentResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(assignmentService.findById(id));
    }

    @PutMapping("/api/lms/assignments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<AssignmentResponse> update(@PathVariable Long id, @Valid @RequestBody CreateAssignmentRequest request) {
        return ResponseEntity.ok(assignmentService.update(id, request));
    }

    @DeleteMapping("/api/lms/assignments/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        assignmentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/lms/assignments/{id}/questions")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<QuestionResponse> addQuestion(@PathVariable Long id, @Valid @RequestBody CreateQuestionRequest request) {
        return ResponseEntity.ok(assignmentService.addQuestion(id, request));
    }

    @PostMapping("/api/lms/assignments/{id}/submit")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<SubmissionResponse> submit(@PathVariable Long id, @Valid @RequestBody SubmitRequest request) {
        request.setAssignmentId(id);
        request.setUserId(currentUserService.getCurrentUserId());
        return ResponseEntity.ok(submissionService.create(request));
    }

    @GetMapping("/api/lms/assignments/{id}/submissions")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<List<SubmissionResponse>> getSubmissions(@PathVariable Long id) {
        return ResponseEntity.ok(assignmentService.findSubmissions(id));
    }

    @GetMapping("/api/lms/assignments/{id}/questions")
    public ResponseEntity<List<QuestionResponse>> getQuestions(@PathVariable Long id) {
        return ResponseEntity.ok(assignmentService.findQuestions(id));
    }
    
    @GetMapping("/api/lms/assignments/{id}/my-submission")
    public ResponseEntity<SubmissionResponse> getMySubmission(@PathVariable Long id) {
        var userId = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(assignmentService.findMySubmission(id, userId));
    }

    @DeleteMapping("/api/lms/assignments/{id}/my-submission")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Void> deleteMySubmission(@PathVariable Long id) {
        var userId = currentUserService.getCurrentUserId();
        submissionService.deleteMySubmission(id, userId);
        return ResponseEntity.noContent().build();
    }
}
