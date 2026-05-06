package com.ttcs.backend.dto.response;

import com.ttcs.backend.enums.CourseStatus;
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
public class CourseResponse {

    private Long id;
    private String title;
    private String description;
    private String thumbnailUrl;
    private CourseStatus status;
    private UUID createdById;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Double progressPercent;
}
