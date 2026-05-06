package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.EnrollmentRequest;
import com.ttcs.backend.dto.response.EnrollmentResponse;
import com.ttcs.backend.entity.Enrollment;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.mapper.EnrollmentMapper;
import com.ttcs.backend.repository.CourseRepository;
import com.ttcs.backend.repository.EnrollmentRepository;
import com.ttcs.backend.repository.LessonProgressRepository;
import com.ttcs.backend.repository.LessonRepository;
import com.ttcs.backend.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final EnrollmentMapper enrollmentMapper;

    public EnrollmentService(EnrollmentRepository enrollmentRepository, UserRepository userRepository,
                            CourseRepository courseRepository,
                            LessonRepository lessonRepository,
                            LessonProgressRepository lessonProgressRepository,
                            EnrollmentMapper enrollmentMapper) {
        this.enrollmentRepository = enrollmentRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.lessonRepository = lessonRepository;
        this.lessonProgressRepository = lessonProgressRepository;
        this.enrollmentMapper = enrollmentMapper;
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> findAll() {
        return enrollmentRepository.findAll().stream()
            .map(e -> enrollmentMapper.toResponse(e, calculateProgress(e)))
            .toList();
    }

    @Transactional(readOnly = true)
    public EnrollmentResponse findById(Long id) {
        Enrollment e = findEnrollmentEntityById(id);
        return enrollmentMapper.toResponse(e, calculateProgress(e));
    }

    private Double calculateProgress(Enrollment enrollment) {
        if (enrollment == null || enrollment.getCourse() == null || enrollment.getUser() == null) {
            return 0.0;
        }
        
        long totalLessons = lessonRepository.findAll().stream()
            .filter(l -> l.getChapter() != null && l.getChapter().getCourse() != null && 
                        enrollment.getCourse().getId().equals(l.getChapter().getCourse().getId()))
            .count();
            
        if (totalLessons == 0) return 0.0;
        
        long completedLessons = lessonProgressRepository.findAll().stream()
            .filter(p -> p.getUser() != null && enrollment.getUser().getId().equals(p.getUser().getId()))
            .filter(p -> p.getLesson() != null && p.getLesson().getChapter() != null && 
                        p.getLesson().getChapter().getCourse() != null && 
                        enrollment.getCourse().getId().equals(p.getLesson().getChapter().getCourse().getId()))
            .filter(p -> Boolean.TRUE.equals(p.getIsCompleted()))
            .count();
            
        return (double) completedLessons * 100 / totalLessons;
    }

    public EnrollmentResponse create(EnrollmentRequest request) {
        Enrollment enrollment = enrollmentMapper.toEntity(request);
        enrollment.setUser(findUserById(request.getUserId()));
        enrollment.setCourse(courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Course not found: " + request.getCourseId())));
        return enrollmentMapper.toResponse(enrollmentRepository.save(enrollment));
    }

    public EnrollmentResponse update(Long id, EnrollmentRequest request) {
        Enrollment enrollment = findEnrollmentEntityById(id);
        enrollment.setUser(findUserById(request.getUserId()));
        enrollment.setCourse(courseRepository.findById(request.getCourseId())
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Course not found: " + request.getCourseId())));
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
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Enrollment not found: " + id));
    }

    private User findUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found: " + id));
    }
}
