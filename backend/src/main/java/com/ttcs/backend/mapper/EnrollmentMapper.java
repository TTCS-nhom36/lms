package com.ttcs.backend.mapper;

import com.ttcs.backend.dto.request.EnrollmentRequest;
import com.ttcs.backend.dto.response.EnrollmentResponse;
import com.ttcs.backend.entity.Course;
import com.ttcs.backend.entity.Enrollment;
import com.ttcs.backend.entity.User;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class EnrollmentMapper {

    public EnrollmentResponse toResponse(Enrollment enrollment) {
        if (enrollment == null) {
            return null;
        }

        return EnrollmentResponse.builder()
                .id(enrollment.getId())
                .userId(enrollment.getUser() != null ? enrollment.getUser().getId() : null)
                .courseId(enrollment.getCourse() != null ? enrollment.getCourse().getId() : null)
                .enrolledAt(enrollment.getEnrolledAt())
                .status(enrollment.getStatus())
                .completedAt(enrollment.getCompletedAt())
                .build();
    }

    public Enrollment toEntity(EnrollmentRequest request) {
        if (request == null) {
            return null;
        }

        return Enrollment.builder()
                .user(mapUserById(request.getUserId()))
                .course(mapCourseById(request.getCourseId()))
                .enrolledAt(request.getEnrolledAt())
                .status(request.getStatus())
                .completedAt(request.getCompletedAt())
                .build();
    }

    private User mapUserById(UUID id) {
        if (id == null) {
            return null;
        }
        User user = new User();
        user.setId(id);
        return user;
    }

    private Course mapCourseById(Long id) {
        if (id == null) {
            return null;
        }
        Course course = new Course();
        course.setId(id);
        return course;
    }
}
