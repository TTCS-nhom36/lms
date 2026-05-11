package com.ttcs.backend.controller.chat;

import com.ttcs.backend.dto.response.UploadedDocumentResponse;
import com.ttcs.backend.service.chat.RagService;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/lms/rag")
@RequiredArgsConstructor
public class RagController {

    private final RagService ragService;

    /**
     * Trigger a full re-index of all LMS data into the vector store.
     */
    @PostMapping("/reindex")
    public ResponseEntity<Map<String, String>> reindex() {
        ragService.indexAll();
        return ResponseEntity.ok(Map.of("status", "Re-indexing completed successfully"));
    }

    /**
     * Upload a PDF file and index its content into the vector store.
     */
    @PostMapping("/upload-pdf")
    public ResponseEntity<UploadedDocumentResponse> uploadPdf(
            @RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new com.ttcs.backend.exception.AppException(
                    com.ttcs.backend.exception.ErrorCode.BAD_REQUEST, "File is empty");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.equals("application/pdf")) {
            throw new com.ttcs.backend.exception.AppException(
                    com.ttcs.backend.exception.ErrorCode.BAD_REQUEST,
                    "Only PDF files are accepted");
        }
        return ResponseEntity.ok(ragService.indexPdf(file));
    }

    /**
     * List all uploaded documents.
     */
    @GetMapping("/documents")
    public ResponseEntity<List<UploadedDocumentResponse>> listDocuments() {
        return ResponseEntity.ok(ragService.listDocuments());
    }
}
