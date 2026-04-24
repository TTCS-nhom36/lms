package com.ttcs.backend.dto.response;

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
public class ChapterResponse {

    private Long id;
    private Long courseId;
    private String title;
    private Integer orderIndex;
    private LocalDateTime createdAt;
}
