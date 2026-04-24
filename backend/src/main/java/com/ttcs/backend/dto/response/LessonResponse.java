package com.ttcs.backend.dto.response;

import com.ttcs.backend.enums.LessonContentType;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonResponse {

    private Long id;
    private Long chapterId;
    private String title;
    private LessonContentType contentType;
    private String contentUrl;
    private String contentText;
    private Integer orderIndex;
    private Long unlockConditionId;
    private Boolean isFreePreview;
    private LocalDateTime createdAt;
}
