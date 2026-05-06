package com.ttcs.backend.mapper;

import com.ttcs.backend.dto.request.CreateAssignmentRequest;
import com.ttcs.backend.dto.response.AssignmentResponse;
import com.ttcs.backend.entity.Assignment;
import com.ttcs.backend.entity.Course;
import com.ttcs.backend.entity.Lesson;
import com.ttcs.backend.entity.User;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class AssignmentMapper {

    public AssignmentResponse toResponse(Assignment assignment) {
        if (assignment == null) {
            return null;
        }

        return AssignmentResponse.builder()
                .id(assignment.getId())
                .lessonId(assignment.getLesson() != null ? assignment.getLesson().getId() : null)
                .courseId(assignment.getCourse() != null ? assignment.getCourse().getId() : null)
                .title(assignment.getTitle())
                .description(assignment.getDescription())
                .type(assignment.getType())
                .dueDate(assignment.getDueDate())
                .allowLate(assignment.getAllowLate())
                .maxScore(assignment.getMaxScore())
                .weight(assignment.getWeight())
                .timeLimitMins(assignment.getTimeLimitMins())
                .shuffleQuestions(assignment.getShuffleQuestions())
                .shuffleOptions(assignment.getShuffleOptions())
                .createdById(assignment.getCreatedBy() != null ? assignment.getCreatedBy().getId() : null)
                .createdAt(assignment.getCreatedAt())
                .build();
    }

    public Assignment toEntity(CreateAssignmentRequest request) {
        if (request == null) {
            return null;
        }

        return Assignment.builder()
                .lesson(mapLessonById(request.getLessonId()))
                .course(mapCourseById(request.getCourseId()))
                .title(request.getTitle())
                .description(request.getDescription())
                .type(request.getType())
                .dueDate(request.getDueDate())
                .allowLate(request.getAllowLate())
                .maxScore(request.getMaxScore())
                .weight(request.getWeight())
                .timeLimitMins(request.getTimeLimitMins())
                .shuffleQuestions(request.getShuffleQuestions())
                .shuffleOptions(request.getShuffleOptions())
                .createdBy(mapUserById(request.getCreatedById()))
                .build();
    }

    private Lesson mapLessonById(Long id) {
        if (id == null) {
            return null;
        }
        Lesson lesson = new Lesson();
        lesson.setId(id);
        return lesson;
    }

    private Course mapCourseById(Long id) {
        if (id == null) {
            return null;
        }
        Course course = new Course();
        course.setId(id);
        return course;
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
