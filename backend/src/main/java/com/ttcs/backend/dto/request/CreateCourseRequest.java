package com.ttcs.backend.dto.request;

import com.ttcs.backend.enums.CourseStatus;
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
public class CreateCourseRequest {

    private String title;
    private String description;
    private String thumbnailUrl;
    private CourseStatus status;
    private UUID createdById;
}
