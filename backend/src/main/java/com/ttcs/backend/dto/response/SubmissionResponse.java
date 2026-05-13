package com.ttcs.backend.dto.response;

import java.math.BigDecimal;
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
public class SubmissionResponse {

    private Long id;
    private Long assignmentId;
    private Long quizAttemptId;
    private UUID userId;
    //
    private LocalDateTime submittedAt;
    private Boolean isLate;
    private String fileUrl;
    private String linkUrl;
    private BigDecimal autoScore;
    private BigDecimal manualScore;
    private BigDecimal finalScore;
    private String feedback;
    private UUID gradedById;
    private LocalDateTime gradedAt;
}
