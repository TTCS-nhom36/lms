package com.ttcs.backend.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;
import lombok.Builder;

@Builder
public record UploadedDocumentResponse(
        UUID id,
        String fileName,
        Long fileSize,
        Integer pageCount,
        Integer chunkCount,
        String uploadedBy,
        LocalDateTime createdAt
) {}
