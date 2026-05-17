package com.ttcs.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.mapper.EnrollmentMapper;
import com.ttcs.backend.service.CourseService;
import com.ttcs.backend.service.CurrentUserService;
import com.ttcs.backend.service.S3Service;
import jakarta.validation.Valid;

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
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<CourseResponse> create(@Valid @RequestBody CreateCourseRequest request) {
        request.setCreatedById(currentUserService.getCurrentUserId());
        return ResponseEntity.ok(courseService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<CourseResponse> update(@PathVariable Long id, @Valid @RequestBody CreateCourseRequest request) {
        return ResponseEntity.ok(courseService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        courseService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<CourseResponse> publish(@PathVariable Long id) {
        return ResponseEntity.ok(courseService.publish(id));
    }

    @PostMapping("/{id}/enroll")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<EnrollmentResponse> enroll(@PathVariable Long id) {
        var userId = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(courseService.enroll(id, userId));
    }

    @PostMapping("/{id}/students/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<EnrollmentResponse> enrollStudent(@PathVariable Long id, @PathVariable java.util.UUID userId) {
        return ResponseEntity.ok(courseService.enrollStudent(id, userId));
    }

    @DeleteMapping("/{id}/students/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<Void> unenrollStudent(@PathVariable Long id, @PathVariable java.util.UUID userId) {
        courseService.unenrollStudent(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/students")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<List<UserResponse>> getStudents(@PathVariable Long id) {
        return ResponseEntity.ok(courseService.findStudents(id));
    }

    @GetMapping("/my-courses")
    public ResponseEntity<List<CourseResponse>> getMyCourses() {
        var userId = currentUserService.getCurrentUserId();
        return ResponseEntity.ok(courseService.findMyCourses(userId));
    }

    @GetMapping("/{id}/gradebook")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<GradebookResponse> getGradebook(@PathVariable Long id) {
        return ResponseEntity.ok(courseService.findGradebook(id));
    }

    @GetMapping(value = "/{id}/gradebook/export", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<byte[]> exportGradebook(@PathVariable Long id) {
        byte[] fileBytes = courseService.exportGradebook(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=gradebook-course-" + id + ".xlsx")
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(fileBytes);
    }

    @PostMapping(value = "/upload-thumbnail", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ResponseEntity<Map<String, String>> uploadThumbnail(@RequestParam("file") MultipartFile file) {
        String key = s3Service.uploadFile(file, "thumbnails");
        String url = s3Service.getFileUrl(key);
        return ResponseEntity.ok(Map.of("url", url, "key", key));
    }

    @GetMapping("/s3-image")
    public ResponseEntity<byte[]> getS3Image(@RequestParam("key") String key) {
        String objectKey = s3Service.getObjectKey(key);
        if (objectKey == null || !objectKey.startsWith("thumbnails/")) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Only course thumbnails can be loaded here");
        }
        byte[] imageBytes = s3Service.getFileBytes(objectKey);
        String contentType = s3Service.getFileContentType(objectKey);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType != null ? contentType : "image/jpeg"))
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .body(imageBytes);
    }
}
