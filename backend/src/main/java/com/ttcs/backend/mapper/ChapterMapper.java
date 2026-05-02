package com.ttcs.backend.mapper;

import org.springframework.stereotype.Component;

import com.ttcs.backend.dto.request.CreateChapterRequest;
import com.ttcs.backend.dto.response.ChapterResponse;
import com.ttcs.backend.entity.Chapter;
import com.ttcs.backend.entity.Course;

@Component
public class ChapterMapper {

    public ChapterResponse toResponse(Chapter chapter) {
        if (chapter == null) {
            return null;
        }

        return ChapterResponse.builder()
                .id(chapter.getId())
                .courseId(chapter.getCourse() != null ? chapter.getCourse().getId() : null)
                .title(chapter.getTitle())
                .orderIndex(chapter.getOrderIndex())
                .createdAt(chapter.getCreatedAt())
                .build();
    }

    public Chapter toEntity(CreateChapterRequest request) {
        if (request == null) {
            return null;
        }

        return Chapter.builder()
                .course(mapCourseById(request.getCourseId()))
                .title(request.getTitle())
                .orderIndex(request.getOrderIndex())
                .build();
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
