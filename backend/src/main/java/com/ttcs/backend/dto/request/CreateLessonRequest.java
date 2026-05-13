package com.ttcs.backend.dto.request;

import com.ttcs.backend.enums.LessonContentType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CreateLessonRequest {

    private Long chapterId;

    @NotBlank(message = "title is required")
    private String title;

    @NotNull(message = "contentType is required")
    private LessonContentType contentType;

    private String contentUrl;
    private String contentText;

    @Min(value = 1, message = "orderIndex must be at least 1")
    private Integer orderIndex;
    private Long unlockConditionId;
    private Boolean isFreePreview;
}
