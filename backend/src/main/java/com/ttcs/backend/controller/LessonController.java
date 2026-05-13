package com.ttcs.backend.controller;

import com.ttcs.backend.dto.request.CreateLessonRequest;
import com.ttcs.backend.dto.request.UpdateLessonProgressRequest;
import com.ttcs.backend.dto.response.LessonProgressResponse;
import com.ttcs.backend.dto.response.LessonResponse;
import com.ttcs.backend.service.CurrentUserService;
import com.ttcs.backend.service.LessonService;
import jakarta.validation.Valid;
import java.util.List;
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
public class LessonController {

    private final LessonService lessonService;
    private final CurrentUserService currentUserService;

    public LessonController(LessonService lessonService, CurrentUserService currentUserService) {
        this.lessonService = lessonService;
        this.currentUserService = currentUserService;
    }

    @GetMapping("/api/lms/chapters/{chapterId}/lessons")
    public ResponseEntity<List<LessonResponse>> getByChapter(@PathVariable Long chapterId) {
        var userId = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(lessonService.findByChapterId(chapterId, userId));
    }

    @PostMapping("/api/lms/chapters/{chapterId}/lessons")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<LessonResponse> create(@PathVariable Long chapterId, @Valid @RequestBody CreateLessonRequest request) {
        return ResponseEntity.ok(lessonService.createForChapter(chapterId, request));
    }

    @GetMapping("/api/lms/lessons/{id}")
    public ResponseEntity<LessonResponse> getById(@PathVariable Long id) {
        var userId = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(lessonService.findAccessibleById(id, userId));
    }

    @PutMapping("/api/lms/lessons/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<LessonResponse> update(@PathVariable Long id, @Valid @RequestBody CreateLessonRequest request) {
        return ResponseEntity.ok(lessonService.update(id, request));
    }

    @DeleteMapping("/api/lms/lessons/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        lessonService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/lms/lessons/{id}/complete")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<LessonProgressResponse> complete(@PathVariable Long id) {
        var userId = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(lessonService.completeLesson(id, userId));
    }

    @PutMapping("/api/lms/lessons/{id}/progress")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<LessonProgressResponse> updateProgress(@PathVariable Long id, @Valid @RequestBody(required = false) UpdateLessonProgressRequest request) {
        var userId = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(lessonService.updateProgress(id, userId, request));
    }

    /**
     * Upload a PDF document for a lesson (max 25 MB).
     * Returns the S3 key to be stored as contentUrl.
     */
    @PostMapping(value = "/api/lms/lessons/upload-document", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<Map<String, String>> uploadDocument(@RequestParam("file") MultipartFile file) {
        String s3Key = lessonService.uploadDocument(file);
        return ResponseEntity.ok(Map.of("s3Key", s3Key));
    }

    /**
     * Get a presigned download URL for a DOCUMENT lesson.
     * URL is valid for 1 hour.
     */
    @GetMapping("/api/lms/lessons/{id}/document-url")
    public ResponseEntity<Map<String, String>> getDocumentUrl(@PathVariable Long id) {
        var userId = currentUserService.getCurrentUserId();
        String url = lessonService.getDocumentPresignedUrl(id, userId);
        return ResponseEntity.ok(Map.of("url", url));
    }
}
