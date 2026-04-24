package com.ttcs.backend.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;
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
public class LessonProgressResponse {

    private Long id;
    private UUID userId;
    private Long lessonId;
    private Boolean isCompleted;
    private Integer watchDurationSecs;
    private LocalDateTime lastAccessedAt;
    private LocalDateTime completedAt;
}
