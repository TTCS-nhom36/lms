package com.ttcs.backend.service.chat;

import com.ttcs.backend.dto.response.UploadedDocumentResponse;
import com.ttcs.backend.entity.*;
import com.ttcs.backend.event.chat.RagDeleteEvent;
import com.ttcs.backend.event.chat.RagSyncEvent;
import com.ttcs.backend.repository.*;
import com.ttcs.backend.service.CurrentUserService;
import com.ttcs.backend.service.S3Service;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionTextParser;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.multipart.MultipartFile;

@Service
@Slf4j
@RequiredArgsConstructor
public class RagService {

    private final VectorStore vectorStore;
    private final CourseRepository courseRepository;
    private final ChapterRepository chapterRepository;
    private final LessonRepository lessonRepository;
    private final AssignmentRepository assignmentRepository;
    private final SubmissionRepository submissionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UploadedDocumentRepository uploadedDocumentRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final S3Service s3Service;

    // @EventListener(ApplicationReadyEvent.class) // Disabled to prevent API rate limits on startup
    @Transactional(readOnly = true)
    public void onStartup() {
        indexAll();
    }

    /**
     * Index all LMS data into the vector store.
     */
    @Transactional(readOnly = true)
    public void indexAll() {
        log.info("=== Starting RAG indexing ===");
        try {
            deleteByFilter("type != 'PDF_DOCUMENT'");
            List<Document> documents = new ArrayList<>();

            // 1. Courses
            List<Course> courses = courseRepository.findAll();
            for (Course course : courses) {
                documents.addAll(createCourseDocuments(course));

                // 2. Chapters & Lessons for each course
                List<Chapter> chapters = chapterRepository
                        .findByCourseIdOrderByOrderIndex(course.getId());
                for (Chapter chapter : chapters) {
                    documents.addAll(createChapterDocuments(chapter));

                    for (Lesson lesson : chapter.getLessons()) {
                        documents.addAll(createLessonDocuments(lesson));
                    }
                }

                // 3. Assignments
                List<Assignment> assignments = assignmentRepository.findByCourseId(course.getId());
                for (Assignment assignment : assignments) {
                    documents.addAll(createAssignmentDocuments(assignment));

                    // Submissions with scores
                    for (Submission sub : assignment.getSubmissions()) {
                        documents.addAll(createSubmissionDocuments(sub));
                    }
                }
            }

            // 4. Enrollments
            List<Enrollment> enrollments = enrollmentRepository.findAll();
            for (Enrollment enrollment : enrollments) {
                documents.addAll(createEnrollmentDocuments(enrollment));
            }

            if (!documents.isEmpty()) {
                // Batch add to vector store
                int batchSize = 20;
                for (int i = 0; i < documents.size(); i += batchSize) {
                    List<Document> batch = documents.subList(i,
                            Math.min(i + batchSize, documents.size()));
                    vectorStore.add(batch);
                    log.info("Indexed batch {}/{}", i / batchSize + 1,
                            (documents.size() + batchSize - 1) / batchSize);
                }
            }

            log.info("=== RAG indexing complete: {} documents indexed ===", documents.size());
        } catch (Exception e) {
            log.error("RAG indexing failed: {}", e.getMessage(), e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public void onRagSyncEvent(RagSyncEvent event) {
        Class<?> clazz = event.entityClass();
        Long id = event.entityId();
        try {
            log.debug("RAG sync triggered for {} with id {}", clazz.getSimpleName(), id);
            List<Document> docs = new ArrayList<>();
            if (clazz.equals(Course.class)) {
                courseRepository.findById(id).ifPresent(c -> docs.addAll(createCourseDocuments(c)));
            } else if (clazz.equals(Chapter.class)) {
                chapterRepository.findById(id).ifPresent(c -> docs.addAll(createChapterDocuments(c)));
            } else if (clazz.equals(Lesson.class)) {
                lessonRepository.findById(id).ifPresent(l -> docs.addAll(createLessonDocuments(l)));
            } else if (clazz.equals(Assignment.class)) {
                assignmentRepository.findById(id).ifPresent(a -> docs.addAll(createAssignmentDocuments(a)));
            } else if (clazz.equals(Question.class)) {
                deleteExistingDocumentsForRemoval(clazz, id);
                log.info("Deleted legacy question documents from vector store for Question id {}", id);
                return;
            } else if (clazz.equals(Submission.class)) {
                submissionRepository.findById(id).ifPresent(s -> docs.addAll(createSubmissionDocuments(s)));
            } else if (clazz.equals(Enrollment.class)) {
                enrollmentRepository.findById(id).ifPresent(e -> docs.addAll(createEnrollmentDocuments(e)));
            }

            if (!docs.isEmpty()) {
                deleteExistingDocumentsForSync(clazz, id);
                vectorStore.add(docs);
                log.info("Indexed {} documents for {} id {}", docs.size(), clazz.getSimpleName(), id);
            }
        } catch (Exception e) {
            log.error("Failed to sync RAG for {} id {}", clazz.getSimpleName(), id, e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRagDeleteEvent(RagDeleteEvent event) {
        Class<?> clazz = event.entityClass();
        Long id = event.entityId();
        try {
            log.info("RAG delete triggered for {} with id {}", clazz.getSimpleName(), id);
            deleteExistingDocumentsForRemoval(clazz, id);
            log.info("Deleted documents from vector store for {} id {}", clazz.getSimpleName(), id);
        } catch (Exception e) {
            log.error("Failed to delete RAG doc for {} id {}", clazz.getSimpleName(), id, e);
        }
    }

    private void deleteExistingDocumentsForSync(Class<?> clazz, Long id) {
        if (clazz.equals(Course.class)) {
            deleteByFilter("courseId == '" + id + "' && docType == 'COURSE'");
        } else if (clazz.equals(Chapter.class)) {
            deleteByFilter("chapterId == '" + id + "' && docType == 'CHAPTER'");
        } else if (clazz.equals(Lesson.class)) {
            deleteByFilter("lessonId == '" + id + "' && (docType == 'LESSON' || docType == 'LESSON_CONTENT' || docType == 'LESSON_DOCUMENT')");
        } else if (clazz.equals(Assignment.class)) {
            deleteByFilter("assignmentId == '" + id + "' && docType == 'ASSIGNMENT'");
        } else if (clazz.equals(Question.class)) {
            deleteByFilter("questionId == '" + id + "' && docType == 'QUIZ_QUESTION'");
        } else if (clazz.equals(Submission.class)) {
            deleteByFilter("submissionId == '" + id + "' && docType == 'SUBMISSION'");
        } else if (clazz.equals(Enrollment.class)) {
            deleteByFilter("enrollmentId == '" + id + "' && docType == 'ENROLLMENT'");
        }
    }

    private void deleteExistingDocumentsForRemoval(Class<?> clazz, Long id) {
        if (clazz.equals(Course.class)) {
            deleteByFilter("courseId == '" + id + "'");
        } else if (clazz.equals(Chapter.class)) {
            deleteByFilter("chapterId == '" + id + "'");
        } else if (clazz.equals(Lesson.class)) {
            deleteByFilter("lessonId == '" + id + "'");
        } else if (clazz.equals(Assignment.class)) {
            deleteByFilter("assignmentId == '" + id + "'");
        } else if (clazz.equals(Question.class)) {
            deleteByFilter("questionId == '" + id + "'");
        } else if (clazz.equals(Submission.class)) {
            deleteByFilter("submissionId == '" + id + "'");
        } else if (clazz.equals(Enrollment.class)) {
            deleteByFilter("enrollmentId == '" + id + "'");
        }
    }

    private void deleteByFilter(String filterExpression) {
        try {
            vectorStore.delete(new FilterExpressionTextParser().parse(filterExpression));
        } catch (Exception e) {
            log.warn("Failed to delete vector documents with filter [{}]: {}", filterExpression, e.getMessage());
        }
    }

    // --- Document Generation Helpers ---

    private List<Document> createCourseDocuments(Course course) {
        return List.of(createDocument(
                "course-" + course.getId(),
                "COURSE",
                String.format("Khóa học: %s\nMô tả: %s\nTrạng thái: %s\nGiảng viên: %s",
                        course.getTitle(),
                        course.getDescription() != null ? course.getDescription() : "",
                        course.getStatus().name(),
                        course.getCreatedBy().getFullName()),
                Map.of(
                        "courseId", course.getId().toString(), 
                        "type", "COURSE",
                        "sourceEntity", "Course",
                        "sourceEntityId", course.getId().toString(),
                        "sensitive", "false",
                        "visibility", "COURSE",
                        "createdBy", course.getCreatedBy().getId().toString()
                )));
    }

    private List<Document> createChapterDocuments(Chapter chapter) {
        if (chapter.getCourse() == null) return List.of();
        return List.of(createDocument(
                "chapter-" + chapter.getId(),
                "CHAPTER",
                String.format("Khóa học: %s\nChương %d: %s",
                        chapter.getCourse().getTitle(), chapter.getOrderIndex(), chapter.getTitle()),
                Map.of("courseId", chapter.getCourse().getId().toString(),
                        "chapterId", chapter.getId().toString(),
                        "createdBy", chapter.getCourse().getCreatedBy().getId().toString(),
                        "sourceEntity", "Chapter",
                        "sourceEntityId", chapter.getId().toString(),
                        "sensitive", "false",
                        "visibility", "COURSE",
                        "type", "CHAPTER")));
    }

    private List<Document> createLessonDocuments(Lesson lesson) {
        if (lesson.getChapter() == null || lesson.getChapter().getCourse() == null) return List.of();
        List<Document> documents = new ArrayList<>();
        Course course = lesson.getChapter().getCourse();
        Chapter chapter = lesson.getChapter();
        String lessonContent = String.format(
                "Khóa học: %s\nChương: %s\nBài học: %s\nLoại: %s",
                course.getTitle(), chapter.getTitle(),
                lesson.getTitle(), lesson.getContentType().name());

        if (lesson.getContentText() != null && !lesson.getContentText().isBlank()) {
            List<String> chunks = chunkText(lesson.getContentText(), 1000);
            for (int i = 0; i < chunks.size(); i++) {
                documents.add(createDocument(
                        "lesson-" + lesson.getId() + "-chunk-" + i,
                        "LESSON_CONTENT",
                        lessonContent + "\nNội dung:\n" + chunks.get(i),
                        Map.of("courseId", course.getId().toString(),
                                "lessonId", lesson.getId().toString(),
                                "createdBy", course.getCreatedBy().getId().toString(),
                                "sourceEntity", "Lesson",
                                "sourceEntityId", lesson.getId().toString(),
                                "sensitive", "false",
                                "visibility", "COURSE",
                                "type", "LESSON_CONTENT",
                                "chunk", String.valueOf(i))));
            }
        } else {
            documents.add(createDocument(
                    "lesson-" + lesson.getId(),
                    "LESSON",
                    lessonContent,
                    Map.of("courseId", course.getId().toString(),
                            "lessonId", lesson.getId().toString(),
                            "createdBy", course.getCreatedBy().getId().toString(),
                            "sourceEntity", "Lesson",
                            "sourceEntityId", lesson.getId().toString(),
                            "sensitive", "false",
                            "visibility", "COURSE",
                            "type", "LESSON")));
        }

        if (lesson.getContentType() == com.ttcs.backend.enums.LessonContentType.DOCUMENT
                && lesson.getContentUrl() != null && !lesson.getContentUrl().isBlank()) {
            documents.addAll(createLessonPdfDocuments(lesson, course, chapter, lessonContent));
        }
        return documents;
    }

    private List<Document> createLessonPdfDocuments(Lesson lesson, Course course, Chapter chapter, String lessonContent) {
        try {
            String objectKey = s3Service.getObjectKey(lesson.getContentUrl());
            deleteByFilter("s3Key == '" + escapeFilterValue(objectKey) + "' && docType == 'LESSON_DOCUMENT_UPLOAD'");
            byte[] pdfBytes = s3Service.getFileBytes(lesson.getContentUrl());
            String fullText = extractPdfText(pdfBytes);
            if (fullText == null || fullText.isBlank()) {
                log.warn("Lesson PDF has no extractable text, lessonId={}", lesson.getId());
                return List.of();
            }

            List<String> chunks = chunkText(fullText, 1000);
            List<Document> documents = new ArrayList<>();
            for (int i = 0; i < chunks.size(); i++) {
                documents.add(createDocument(
                        "lesson-" + lesson.getId() + "-pdf-chunk-" + i,
                        "LESSON_DOCUMENT",
                        lessonContent + "\nTài liệu PDF:\n" + chunks.get(i),
                        Map.ofEntries(
                                Map.entry("courseId", course.getId().toString()),
                                Map.entry("chapterId", chapter.getId().toString()),
                                Map.entry("lessonId", lesson.getId().toString()),
                                Map.entry("createdBy", course.getCreatedBy().getId().toString()),
                                Map.entry("sourceEntity", "Lesson"),
                                Map.entry("sourceEntityId", lesson.getId().toString()),
                                Map.entry("sensitive", "false"),
                                Map.entry("visibility", "COURSE"),
                                Map.entry("type", "LESSON_DOCUMENT"),
                                Map.entry("fileUrl", lesson.getContentUrl()),
                                Map.entry("chunk", String.valueOf(i)))));
            }
            return documents;
        } catch (Exception e) {
            log.warn("Failed to index lesson PDF lessonId={}: {}", lesson.getId(), e.getMessage());
            return List.of();
        }
    }

    private List<Document> createAssignmentDocuments(Assignment assignment) {
        if (assignment.getCourse() == null) return List.of();
        Course course = assignment.getCourse();
        String assignmentText = String.format(
                "Khóa học: %s\nBài tập: %s\nLoại: %s\nĐiểm tối đa: %s\nHạn nộp: %s\nMô tả: %s",
                course.getTitle(), assignment.getTitle(),
                assignment.getType().name(), assignment.getMaxScore(),
                assignment.getDueDate() != null ? assignment.getDueDate().toString() : "không có",
                assignment.getDescription() != null ? assignment.getDescription() : "");

        if (assignment.getTimeLimitMins() != null) {
            assignmentText += "\nGiới hạn thời gian: " + assignment.getTimeLimitMins() + " phút";
        }

        return List.of(createDocument(
                "assignment-" + assignment.getId(),
                "ASSIGNMENT",
                assignmentText,
                Map.of("courseId", course.getId().toString(),
                        "assignmentId", assignment.getId().toString(),
                        "createdBy", course.getCreatedBy().getId().toString(),
                        "sourceEntity", "Assignment",
                        "sourceEntityId", assignment.getId().toString(),
                        "sensitive", "false",
                        "visibility", "COURSE",
                        "type", "ASSIGNMENT")));
    }

    private List<Document> createSubmissionDocuments(Submission sub) {
        if (sub.getAssignment() == null || sub.getAssignment().getCourse() == null || sub.getUser() == null) return List.of();
        Course course = sub.getAssignment().getCourse();
        Assignment assignment = sub.getAssignment();
        String subText = String.format(
                "Khóa học: %s\nBài tập: %s\nSinh viên: %s\nĐiểm: %s/%s\nTrễ: %s\nNhận xét: %s",
                course.getTitle(), assignment.getTitle(),
                sub.getUser().getFullName(),
                sub.getFinalScore() != null ? sub.getFinalScore()
                        : (sub.getAutoScore() != null ? sub.getAutoScore() + " (tự chấm)"
                                : "chưa chấm"),
                assignment.getMaxScore(),
                sub.getIsLate() ? "Có" : "Không",
                sub.getFeedback() != null ? sub.getFeedback() : "không có");
        return List.of(createDocument(
                "submission-" + sub.getId(),
                "SUBMISSION",
                subText,
                Map.of("courseId", course.getId().toString(),
                        "assignmentId", assignment.getId().toString(),
                        "submissionId", sub.getId().toString(),
                        "userId", sub.getUser().getId().toString(),
                        "ownerUserId", sub.getUser().getId().toString(),
                        "sourceEntity", "Submission",
                        "sourceEntityId", sub.getId().toString(),
                        "sensitive", "true",
                        "visibility", "USER",
                        "type", "SUBMISSION")));
    }

    private List<Document> createEnrollmentDocuments(Enrollment enrollment) {
        if (enrollment.getUser() == null || enrollment.getCourse() == null) return List.of();
        return List.of(createDocument(
                "enrollment-" + enrollment.getId(),
                "ENROLLMENT",
                String.format("Sinh viên %s đã đăng ký khóa học %s. Trạng thái: %s",
                        enrollment.getUser().getFullName(),
                        enrollment.getCourse().getTitle(),
                        enrollment.getStatus().name()),
                Map.of("courseId", enrollment.getCourse().getId().toString(),
                        "enrollmentId", enrollment.getId().toString(),
                        "userId", enrollment.getUser().getId().toString(),
                        "ownerUserId", enrollment.getUser().getId().toString(),
                        "sourceEntity", "Enrollment",
                        "sourceEntityId", enrollment.getId().toString(),
                        "sensitive", "true",
                        "visibility", "USER",
                        "type", "ENROLLMENT")));
    }

    /**
     * Search for relevant documents given a query.
     */
    public List<Document> search(String query, int topK) {
        return search(query, topK, null);
    }

    /**
     * Search for relevant documents with metadata filters.
     */
    public List<Document> search(String query, int topK, String filterExpression) {
        SearchRequest.Builder builder = SearchRequest.builder()
                .query(query)
                .topK(topK);
        if (filterExpression != null && !filterExpression.isBlank()) {
            builder.filterExpression(new FilterExpressionTextParser().parse(filterExpression));
        }
        return vectorStore.similaritySearch(
                builder.build());
    }

    /**
     * Build a context string from search results.
     */
    public String buildContext(String query) {
        return buildContext(query, null);
    }

    /**
     * Build a context string from filtered search results.
     */
    public String buildContext(String query, String filterExpression) {
        List<Document> results = search(query, 10, filterExpression);
        return buildContextFromResults(results);
    }

    public String buildContextFromResults(List<Document> results) {
        if (results.isEmpty()) {
            return "Không tìm thấy thông tin liên quan trong cơ sở dữ liệu.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("====== DỮ LIỆU TỪ HỆ THỐNG LMS (").append(results.size()).append(" kết quả) ======\n\n");
        for (int i = 0; i < results.size(); i++) {
            Document doc = results.get(i);
            String type = doc.getMetadata().getOrDefault("type", "UNKNOWN").toString();
            sb.append("--- [").append(type).append("] ---\n");
            sb.append(doc.getText()).append("\n\n");
        }
        return sb.toString();
    }

    // PDF Upload & Index

    /**
     * Upload a PDF, extract text, chunk it, and index into the vector store.
     */
    @Transactional
    public UploadedDocumentResponse indexPdf(MultipartFile file) throws IOException {
        java.util.UUID userId = currentUserService.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new com.ttcs.backend.exception.AppException(
                        com.ttcs.backend.exception.ErrorCode.USER_NOT_FOUND));

        String fileName = file.getOriginalFilename();
        log.info("Indexing PDF: {} ({} bytes)", fileName, file.getSize());

        // Extract text from PDF
        String fullText;
        int pageCount;
        try (InputStream is = file.getInputStream();
             PDDocument pdf = Loader.loadPDF(is.readAllBytes())) {
            pageCount = pdf.getNumberOfPages();
            PDFTextStripper stripper = new PDFTextStripper();
            fullText = stripper.getText(pdf);
        }

        if (fullText == null || fullText.isBlank()) {
            throw new com.ttcs.backend.exception.AppException(
                    com.ttcs.backend.exception.ErrorCode.BAD_REQUEST,
                    "PDF không chứa nội dung text có thể trích xuất.");
        }

        // Chunk and create documents
        List<String> chunks = chunkText(fullText, 1000);
        List<Document> documents = new ArrayList<>();
        String docIdBase = "pdf-" + fileName + "-" + System.currentTimeMillis();

        for (int i = 0; i < chunks.size(); i++) {
            String content = "Tài liệu PDF: " + fileName + "\n\n" + chunks.get(i);
            documents.add(createDocument(
                    docIdBase + "-chunk-" + i,
                    "PDF_DOCUMENT",
                    content,
                    Map.ofEntries(
                            Map.entry("type", "PDF_DOCUMENT"),
                            Map.entry("fileName", fileName),
                            Map.entry("chunk", String.valueOf(i)),
                            Map.entry("userId", user.getId().toString()),
                            Map.entry("ownerUserId", user.getId().toString()),
                            Map.entry("sourceEntity", "UploadedDocument"),
                            Map.entry("sourceEntityId", docIdBase),
                            Map.entry("sensitive", "true"),
                            Map.entry("visibility", "USER"),
                            Map.entry("uploadedByUserId", user.getId().toString()),
                            Map.entry("uploadedBy", user.getFullName()))));
        }

        // Batch add to vector store
        int batchSize = 20;
        for (int i = 0; i < documents.size(); i += batchSize) {
            List<Document> batch = documents.subList(i,
                    Math.min(i + batchSize, documents.size()));
            vectorStore.add(batch);
        }

        log.info("PDF indexed: {} -> {} chunks", fileName, chunks.size());

        // Save metadata
        UploadedDocument doc = UploadedDocument.builder()
                .uploadedBy(user)
                .fileName(fileName)
                .fileSize(file.getSize())
                .pageCount(pageCount)
                .chunkCount(chunks.size())
                .build();
        uploadedDocumentRepository.save(doc);

        return UploadedDocumentResponse.builder()
                .id(doc.getId())
                .fileName(doc.getFileName())
                .fileSize(doc.getFileSize())
                .pageCount(doc.getPageCount())
                .chunkCount(doc.getChunkCount())
                .uploadedBy(user.getFullName())
                .createdAt(doc.getCreatedAt())
                .build();
    }

    public int indexUploadedLessonDocument(MultipartFile file, String s3Key, String objectUrl) throws IOException {
        java.util.UUID userId = currentUserService.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new com.ttcs.backend.exception.AppException(
                        com.ttcs.backend.exception.ErrorCode.USER_NOT_FOUND));

        String fileName = file.getOriginalFilename();
        String fullText = extractPdfText(file);
        if (fullText == null || fullText.isBlank()) {
            throw new com.ttcs.backend.exception.AppException(
                    com.ttcs.backend.exception.ErrorCode.BAD_REQUEST,
                    "PDF không chứa nội dung text có thể trích xuất.");
        }

        List<String> chunks = chunkText(fullText, 1000);
        List<Document> documents = new ArrayList<>();
        String docIdBase = "lesson-upload-" + s3Key;
        for (int i = 0; i < chunks.size(); i++) {
            documents.add(createDocument(
                    docIdBase + "-chunk-" + i,
                    "LESSON_DOCUMENT_UPLOAD",
                    "Tài liệu bài học PDF: " + fileName + "\n\n" + chunks.get(i),
                    Map.ofEntries(
                            Map.entry("type", "LESSON_DOCUMENT_UPLOAD"),
                            Map.entry("fileName", fileName != null ? fileName : ""),
                            Map.entry("fileUrl", objectUrl),
                            Map.entry("s3Key", s3Key),
                            Map.entry("chunk", String.valueOf(i)),
                            Map.entry("userId", user.getId().toString()),
                            Map.entry("ownerUserId", user.getId().toString()),
                            Map.entry("sourceEntity", "LessonUpload"),
                            Map.entry("sourceEntityId", s3Key),
                            Map.entry("sensitive", "true"),
                            Map.entry("visibility", "USER"),
                            Map.entry("uploadedByUserId", user.getId().toString()),
                            Map.entry("uploadedBy", user.getFullName()))));
        }
        addDocumentsInBatches(documents);
        log.info("Uploaded lesson PDF indexed: {} -> {} chunks", fileName, chunks.size());
        return chunks.size();
    }

    /**
     * List all uploaded documents.
     */
    @Transactional(readOnly = true)
    public List<UploadedDocumentResponse> listDocuments() {
        return uploadedDocumentRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(doc -> UploadedDocumentResponse.builder()
                        .id(doc.getId())
                        .fileName(doc.getFileName())
                        .fileSize(doc.getFileSize())
                        .pageCount(doc.getPageCount())
                        .chunkCount(doc.getChunkCount())
                        .uploadedBy(doc.getUploadedBy().getFullName())
                        .createdAt(doc.getCreatedAt())
                        .build())
                .toList();
    }

    // Helpers

    private Document createDocument(String id, String type, String content,
            Map<String, Object> extraMetadata) {
        Map<String, Object> metadata = new HashMap<>(extraMetadata);
        metadata.putIfAbsent("type", type);
        metadata.put("docType", type);
        metadata.putIfAbsent("sourceEntity", type);
        metadata.putIfAbsent("sourceEntityId", id);
        metadata.putIfAbsent("sensitive", "false");
        String uuid = java.util.UUID.nameUUIDFromBytes(id.getBytes()).toString();
        return new Document(uuid, content, metadata);
    }

    private String escapeFilterValue(String value) {
        return value == null ? "" : value.replace("'", "\\'");
    }

    private String extractPdfText(MultipartFile file) throws IOException {
        try (InputStream is = file.getInputStream();
             PDDocument pdf = Loader.loadPDF(is.readAllBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(pdf);
        }
    }

    private String extractPdfText(byte[] pdfBytes) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(pdf);
        }
    }

    private void addDocumentsInBatches(List<Document> documents) {
        int batchSize = 20;
        for (int i = 0; i < documents.size(); i += batchSize) {
            List<Document> batch = documents.subList(i, Math.min(i + batchSize, documents.size()));
            vectorStore.add(batch);
        }
    }

    private List<String> chunkText(String text, int chunkSize) {
        List<String> chunks = new ArrayList<>();
        if (text == null || text.isBlank())
            return chunks;

        String[] paragraphs = text.split("\n\n+");
        StringBuilder current = new StringBuilder();

        for (String para : paragraphs) {
            if (current.length() + para.length() > chunkSize && !current.isEmpty()) {
                chunks.add(current.toString().trim());
                current = new StringBuilder();
            }
            current.append(para).append("\n\n");
        }
        if (!current.isEmpty()) {
            chunks.add(current.toString().trim());
        }

        return chunks.isEmpty() ? List.of(text) : chunks;
    }
}
