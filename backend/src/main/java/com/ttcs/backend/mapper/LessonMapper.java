package com.ttcs.backend.mapper;

import com.ttcs.backend.dto.request.CreateLessonRequest;
import com.ttcs.backend.dto.response.LessonResponse;
import com.ttcs.backend.entity.Chapter;
import com.ttcs.backend.entity.Lesson;
import org.springframework.stereotype.Component;

@Component
public class LessonMapper {

    public LessonResponse toResponse(Lesson lesson) {
        return toResponse(lesson, null);
    }

    public LessonResponse toResponse(Lesson lesson, com.ttcs.backend.entity.LessonProgress progress) {
        if (lesson == null) {
            return null;
        }

        return LessonResponse.builder()
                .id(lesson.getId())
                .chapterId(lesson.getChapter() != null ? lesson.getChapter().getId() : null)
                .title(lesson.getTitle())
                .contentType(lesson.getContentType())
                .contentUrl(lesson.getContentUrl())
                .contentText(lesson.getContentText())
                .orderIndex(lesson.getOrderIndex())
                .unlockConditionId(lesson.getUnlockCondition() != null ? lesson.getUnlockCondition().getId() : null)
                .isFreePreview(lesson.getIsFreePreview())
                .isCompleted(progress != null ? progress.getIsCompleted() : false)
                .watchDurationSecs(progress != null ? progress.getWatchDurationSecs() : 0)
                .createdAt(lesson.getCreatedAt())
                .build();
    }

    public Lesson toEntity(CreateLessonRequest request) {
        if (request == null) {
            return null;
        }

        return Lesson.builder()
                .chapter(mapChapterById(request.getChapterId()))
                .title(request.getTitle())
                .contentType(request.getContentType())
                .contentUrl(request.getContentUrl())
                .contentText(request.getContentText())
                .orderIndex(request.getOrderIndex())
                .unlockCondition(mapLessonById(request.getUnlockConditionId()))
                .isFreePreview(request.getIsFreePreview())
                .build();
    }

    private Chapter mapChapterById(Long id) {
        if (id == null) {
            return null;
        }
        Chapter chapter = new Chapter();
        chapter.setId(id);
        return chapter;
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
