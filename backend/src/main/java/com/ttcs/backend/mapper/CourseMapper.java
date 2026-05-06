package com.ttcs.backend.mapper;

import com.ttcs.backend.dto.request.CreateCourseRequest;
import com.ttcs.backend.dto.response.CourseResponse;
import com.ttcs.backend.entity.Course;
import com.ttcs.backend.entity.User;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class CourseMapper {

    public CourseResponse toResponse(Course course) {
        if (course == null) {
            return null;
        }

        return CourseResponse.builder()
                .id(course.getId())
                .title(course.getTitle())
                .description(course.getDescription())
                .thumbnailUrl(course.getThumbnailUrl())
                .status(course.getStatus())
                .createdById(course.getCreatedBy() != null ? course.getCreatedBy().getId() : null)
                .createdAt(course.getCreatedAt())
                .updatedAt(course.getUpdatedAt())
                .build();
    }

    public Course toEntity(CreateCourseRequest request) {
        if (request == null) {
            return null;
        }

        return Course.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .thumbnailUrl(request.getThumbnailUrl())
                .status(request.getStatus())
                .createdBy(mapUserById(request.getCreatedById()))
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
}
