package com.ttcs.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.ttcs.backend.dto.request.CreateCourseRequest;
import com.ttcs.backend.dto.response.CourseDetailResponse;
import com.ttcs.backend.dto.response.CourseResponse;
import com.ttcs.backend.dto.response.EnrollmentResponse;
import com.ttcs.backend.dto.response.GradebookResponse;
import com.ttcs.backend.dto.response.PageResponse;
import com.ttcs.backend.dto.response.UserResponse;
import com.ttcs.backend.enums.CourseStatus;
import com.ttcs.backend.mapper.EnrollmentMapper;
import com.ttcs.backend.service.CourseService;
import com.ttcs.backend.service.CurrentUserService;
import com.ttcs.backend.service.S3Service;

@RestController
@RequestMapping("/api/lms/courses")
public class CourseController {

    private final CourseService courseService;
    private final EnrollmentMapper enrollmentMapper;
    private final CurrentUserService currentUserService;
    private final S3Service s3Service;

    public CourseController(CourseService courseService, EnrollmentMapper enrollmentMapper,
            CurrentUserService currentUserService, S3Service s3Service) {
        this.courseService = courseService;
        this.enrollmentMapper = enrollmentMapper;
        this.currentUserService = currentUserService;
        this.s3Service = s3Service;
    }

    @GetMapping
    public ResponseEntity<PageResponse<CourseResponse>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) CourseStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(courseService.findPage(search, status, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourseDetailResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(courseService.findDetail(id));
    }

    @PostMapping
    public ResponseEntity<CourseResponse> create(@RequestBody CreateCourseRequest request) {
        return ResponseEntity.ok(courseService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CourseResponse> update(@PathVariable Long id, @RequestBody CreateCourseRequest request) {
        return ResponseEntity.ok(courseService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        courseService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/publish")
    public ResponseEntity<CourseResponse> publish(@PathVariable Long id) {
        return ResponseEntity.ok(courseService.publish(id));
    }

    @PostMapping("/{id}/enroll")
    public ResponseEntity<EnrollmentResponse> enroll(@PathVariable Long id) {
        var userId = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(courseService.enroll(id, userId));
    }

    @GetMapping("/{id}/students")
    public ResponseEntity<List<UserResponse>> getStudents(@PathVariable Long id) {
        return ResponseEntity.ok(courseService.findStudents(id));
    }

    @GetMapping("/my-courses")
    public ResponseEntity<List<CourseResponse>> getMyCourses() {
        var userId = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(courseService.findMyCourses(userId));
    }

    @GetMapping("/{id}/gradebook")
    public ResponseEntity<GradebookResponse> getGradebook(@PathVariable Long id) {
        return ResponseEntity.ok(courseService.findGradebook(id));
    }

    @GetMapping(value = "/{id}/gradebook/export", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportGradebook(@PathVariable Long id) {
        byte[] fileBytes = courseService.exportGradebook(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=gradebook-course-" + id + ".xlsx")
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(fileBytes);
    }

    @PostMapping(value = "/upload-thumbnail", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadThumbnail(@RequestParam("file") MultipartFile file) {
        String key = s3Service.uploadFile(file, "thumbnails");
        String url = s3Service.getFileUrl(key);
        return ResponseEntity.ok(Map.of("url", url, "key", key));
    }

    @GetMapping("/s3-image")
    public ResponseEntity<byte[]> getS3Image(@RequestParam("key") String key) {
        byte[] imageBytes = s3Service.getFileBytes(key);
        String contentType = s3Service.getFileContentType(key);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType != null ? contentType : "image/jpeg"))
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .body(imageBytes);
    }
}
