package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.EnrollmentRequest;
import com.ttcs.backend.dto.response.EnrollmentResponse;
import com.ttcs.backend.entity.Enrollment;
import com.ttcs.backend.mapper.EnrollmentMapper;
import com.ttcs.backend.repository.CourseRepository;
import com.ttcs.backend.repository.EnrollmentRepository;
import com.ttcs.backend.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentMapper enrollmentMapper;

    public EnrollmentService(EnrollmentRepository enrollmentRepository, UserRepository userRepository, CourseRepository courseRepository, EnrollmentMapper enrollmentMapper) {
        this.enrollmentRepository = enrollmentRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.enrollmentMapper = enrollmentMapper;
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> findAll() {
        return enrollmentRepository.findAll().stream().map(enrollmentMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public EnrollmentResponse findById(Long id) {
        return enrollmentMapper.toResponse(findEnrollmentEntityById(id));
    }

    public EnrollmentResponse create(EnrollmentRequest request) {
        Enrollment enrollment = enrollmentMapper.toEntity(request);
        enrollment.setUser(findUserById(request.getUserId()));
        enrollment.setCourse(courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found: " + request.getCourseId())));
        return enrollmentMapper.toResponse(enrollmentRepository.save(enrollment));
    }

    public EnrollmentResponse update(Long id, EnrollmentRequest request) {
        Enrollment enrollment = findEnrollmentEntityById(id);
        enrollment.setUser(findUserById(request.getUserId()));
        enrollment.setCourse(courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found: " + request.getCourseId())));
        enrollment.setEnrolledAt(request.getEnrolledAt());
        enrollment.setStatus(request.getStatus());
        enrollment.setCompletedAt(request.getCompletedAt());
        return enrollmentMapper.toResponse(enrollmentRepository.save(enrollment));
    }

    public void delete(Long id) {
        enrollmentRepository.delete(findEnrollmentEntityById(id));
    }

    private Enrollment findEnrollmentEntityById(Long id) {
        return enrollmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Enrollment not found: " + id));
    }

    private com.ttcs.backend.entity.User findUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id));
    }
}
