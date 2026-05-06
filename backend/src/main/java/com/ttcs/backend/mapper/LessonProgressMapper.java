package com.ttcs.backend.mapper;

import com.ttcs.backend.dto.request.LessonProgressRequest;
import com.ttcs.backend.dto.response.LessonProgressResponse;
import com.ttcs.backend.entity.Lesson;
import com.ttcs.backend.entity.LessonProgress;
import com.ttcs.backend.entity.User;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class LessonProgressMapper {

    public LessonProgressResponse toResponse(LessonProgress lessonProgress) {
        if (lessonProgress == null) {
            return null;
        }

        return LessonProgressResponse.builder()
                .id(lessonProgress.getId())
                .userId(lessonProgress.getUser() != null ? lessonProgress.getUser().getId() : null)
                .lessonId(lessonProgress.getLesson() != null ? lessonProgress.getLesson().getId() : null)
                .isCompleted(lessonProgress.getIsCompleted())
                .watchDurationSecs(lessonProgress.getWatchDurationSecs())
                .lastAccessedAt(lessonProgress.getLastAccessedAt())
                .completedAt(lessonProgress.getCompletedAt())
                .build();
    }

    public LessonProgress toEntity(LessonProgressRequest request) {
        if (request == null) {
            return null;
        }

        return LessonProgress.builder()
                .user(mapUserById(request.getUserId()))
                .lesson(mapLessonById(request.getLessonId()))
                .isCompleted(request.getIsCompleted())
                .watchDurationSecs(request.getWatchDurationSecs())
                .lastAccessedAt(request.getLastAccessedAt())
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

    private Lesson mapLessonById(Long id) {
        if (id == null) {
            return null;
        }
        Lesson lesson = new Lesson();
        lesson.setId(id);
        return lesson;
    }
}
