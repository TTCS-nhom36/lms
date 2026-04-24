package com.ttcs.backend.controller;

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
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/lms/courses")
public class CourseController {

    private final CourseService courseService;
    private final EnrollmentMapper enrollmentMapper;

    public CourseController(CourseService courseService, EnrollmentMapper enrollmentMapper) {
        this.courseService = courseService;
        this.enrollmentMapper = enrollmentMapper;
    }

    @GetMapping
    public ResponseEntity<PageResponse<CourseResponse>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) CourseStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
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
        courseService.archive(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/publish")
    public ResponseEntity<CourseResponse> publish(@PathVariable Long id) {
        return ResponseEntity.ok(courseService.publish(id));
    }

    @PostMapping("/{id}/enroll")
    public ResponseEntity<EnrollmentResponse> enroll(@PathVariable Long id, @RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(courseService.enroll(id, userId));
    }

    @GetMapping("/{id}/students")
    public ResponseEntity<List<UserResponse>> getStudents(@PathVariable Long id) {
        return ResponseEntity.ok(courseService.findStudents(id));
    }

    @GetMapping("/my-courses")
    public ResponseEntity<List<CourseResponse>> getMyCourses(@RequestHeader("X-User-Id") UUID userId) {
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
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(fileBytes);
    }
}
