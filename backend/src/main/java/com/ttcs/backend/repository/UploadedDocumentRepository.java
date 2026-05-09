package com.ttcs.backend.repository;

import com.ttcs.backend.entity.UploadedDocument;
import com.ttcs.backend.entity.User;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UploadedDocumentRepository extends JpaRepository<UploadedDocument, UUID> {

    List<UploadedDocument> findByUploadedByOrderByCreatedAtDesc(User user);

    List<UploadedDocument> findAllByOrderByCreatedAtDesc();
}
