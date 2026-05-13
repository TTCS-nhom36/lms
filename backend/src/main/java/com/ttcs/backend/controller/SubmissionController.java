package com.ttcs.backend.controller;

import com.ttcs.backend.dto.request.GradeSubmissionRequest;
import com.ttcs.backend.dto.request.SubmitRequest;
import com.ttcs.backend.dto.response.SubmissionResponse;
import com.ttcs.backend.service.CurrentUserService;
import com.ttcs.backend.service.SubmissionService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class SubmissionController {

    private final SubmissionService submissionService;
    private final CurrentUserService currentUserService;

    public SubmissionController(SubmissionService submissionService, CurrentUserService currentUserService) {
        this.submissionService = submissionService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/api/lms/submissions/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<SubmissionResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(submissionService.findManagedById(id));
    }

    @PostMapping("/api/lms/submissions")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<SubmissionResponse> create(@Valid @RequestBody SubmitRequest request) {
        return ResponseEntity.ok(submissionService.createManaged(request));
    }

    @PutMapping("/api/lms/submissions/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<SubmissionResponse> update(@PathVariable Long id, @Valid @RequestBody SubmitRequest request) {
        return ResponseEntity.ok(submissionService.update(id, request));
    }

    @DeleteMapping("/api/lms/submissions/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        submissionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/api/lms/submissions/{id}/grade")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<SubmissionResponse> grade(@PathVariable Long id, @RequestBody GradeSubmissionRequest request) {
        var gradedById = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(submissionService.grade(id, request, gradedById));
    }

    /**
     * Upload a file for a FILE_UPLOAD submission (max 50 MB, any type).
     * Returns the S3 key to be stored as fileUrl.
     */
    @PostMapping(value = "/api/lms/submissions/upload-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadSubmissionFile(@RequestParam("file") MultipartFile file) {
        String s3Key = submissionService.uploadSubmissionFile(file);
        return ResponseEntity.ok(Map.of("s3Key", s3Key));
    }

    /**
     * Get a presigned download URL for a submission's file (valid 1h).
     * Used by both student and instructor to download the submitted file.
     */
    @GetMapping("/api/lms/submissions/{id}/file-url")
    public ResponseEntity<Map<String, String>> getSubmissionFileUrl(@PathVariable Long id) {
        String url = submissionService.getSubmissionFileUrl(id);
        return ResponseEntity.ok(Map.of("url", url));
    }
}
