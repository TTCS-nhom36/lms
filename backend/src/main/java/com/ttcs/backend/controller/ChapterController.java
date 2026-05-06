package com.ttcs.backend.controller;

import com.ttcs.backend.dto.request.ChapterReorderRequest;
import com.ttcs.backend.dto.request.CreateChapterRequest;
import com.ttcs.backend.dto.response.ChapterResponse;
import com.ttcs.backend.service.ChapterService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ChapterController {

    private final ChapterService chapterService;

    public ChapterController(ChapterService chapterService) {
        this.chapterService = chapterService;
    }

    @GetMapping("/api/lms/courses/{courseId}/chapters")
    public ResponseEntity<List<ChapterResponse>> getByCourse(@PathVariable Long courseId) {
        return ResponseEntity.ok(chapterService.findByCourseId(courseId));
    }

    @PostMapping("/api/lms/courses/{courseId}/chapters")
    public ResponseEntity<ChapterResponse> create(@PathVariable Long courseId, @RequestBody CreateChapterRequest request) {
        return ResponseEntity.ok(chapterService.createForCourse(courseId, request));
    }

    @PutMapping("/api/lms/chapters/{id}")
    public ResponseEntity<ChapterResponse> update(@PathVariable Long id, @RequestBody CreateChapterRequest request) {
        return ResponseEntity.ok(chapterService.update(id, request));
    }

    @DeleteMapping("/api/lms/chapters/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        chapterService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/api/lms/chapters/reorder")
    public ResponseEntity<List<ChapterResponse>> reorder(@RequestBody ChapterReorderRequest request) {
        Long courseId = request != null && request.getChapterIds() != null && !request.getChapterIds().isEmpty()
                ? chapterService.findById(request.getChapterIds().get(0)).getCourseId()
                : null;
        if (courseId == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(chapterService.reorder(courseId, request));
    }
}
