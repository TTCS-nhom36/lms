package com.ttcs.backend.dto.response;

import com.ttcs.backend.enums.EnrollmentStatus;
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
public class EnrollmentResponse {

    private Long id;
    private UUID userId;
    private Long courseId;
    private LocalDateTime enrolledAt;
    private EnrollmentStatus status;
    private LocalDateTime completedAt;
}
