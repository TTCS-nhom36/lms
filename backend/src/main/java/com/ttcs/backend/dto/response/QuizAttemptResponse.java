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
public class QuizAttemptResponse {

    private Long id;
    private UUID userId;
    private Long assignmentId;
    private LocalDateTime createdAt;
}
