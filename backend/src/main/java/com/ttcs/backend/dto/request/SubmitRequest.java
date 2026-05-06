package com.ttcs.backend.dto.request;

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
public class SubmitRequest {

    private Long assignmentId;
    private UUID userId;
    private Boolean isLate;
    private String fileUrl;
    private String linkUrl;
    private java.math.BigDecimal autoScore;
}
