package com.ttcs.backend.controller;

import com.ttcs.backend.dto.request.CreateLessonRequest;
import com.ttcs.backend.dto.request.UpdateLessonProgressRequest;
import com.ttcs.backend.dto.response.LessonProgressResponse;
import com.ttcs.backend.dto.response.LessonResponse;
import com.ttcs.backend.service.CurrentUserService;
import com.ttcs.backend.service.LessonService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

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
        return ResponseEntity.ok(lessonService.findByChapterId(chapterId));
    }

    @PostMapping("/api/lms/chapters/{chapterId}/lessons")
    public ResponseEntity<LessonResponse> create(@PathVariable Long chapterId, @RequestBody CreateLessonRequest request) {
        return ResponseEntity.ok(lessonService.createForChapter(chapterId, request));
    }

    @GetMapping("/api/lms/lessons/{id}")
    public ResponseEntity<LessonResponse> getById(@PathVariable Long id) {
        var userId = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(lessonService.findAccessibleById(id, userId));
    }

    @PutMapping("/api/lms/lessons/{id}")
    public ResponseEntity<LessonResponse> update(@PathVariable Long id, @RequestBody CreateLessonRequest request) {
        return ResponseEntity.ok(lessonService.update(id, request));
    }

    @DeleteMapping("/api/lms/lessons/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        lessonService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/lms/lessons/{id}/complete")
    public ResponseEntity<LessonProgressResponse> complete(@PathVariable Long id) {
        var userId = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(lessonService.completeLesson(id, userId));
    }

    @PutMapping("/api/lms/lessons/{id}/progress")
    public ResponseEntity<LessonProgressResponse> updateProgress(@PathVariable Long id, @RequestBody(required = false) UpdateLessonProgressRequest request) {
        var userId = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(lessonService.updateProgress(id, userId, request));
    }
}
