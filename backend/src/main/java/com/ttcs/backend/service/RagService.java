package com.ttcs.backend.service;

import com.ttcs.backend.dto.response.UploadedDocumentResponse;
import com.ttcs.backend.entity.*;
import com.ttcs.backend.repository.*;
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
    private final QuestionRepository questionRepository;
    private final SubmissionRepository submissionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UploadedDocumentRepository uploadedDocumentRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

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

                // 3. Assignments & Quiz Questions
                List<Assignment> assignments = assignmentRepository.findByCourseId(course.getId());
                for (Assignment assignment : assignments) {
                    documents.addAll(createAssignmentDocuments(assignment));

                    // Quiz questions with answers
                    if (assignment.getType().name().equals("QUIZ")) {
                        List<Question> questions = questionRepository
                                .findByAssignmentId(assignment.getId());
                        for (Question q : questions) {
                            documents.addAll(createQuestionDocuments(q));
                        }
                    }

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
    public void onRagSyncEvent(com.ttcs.backend.event.RagSyncEvent event) {
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
                questionRepository.findById(id).ifPresent(q -> docs.addAll(createQuestionDocuments(q)));
            } else if (clazz.equals(Submission.class)) {
                submissionRepository.findById(id).ifPresent(s -> docs.addAll(createSubmissionDocuments(s)));
            } else if (clazz.equals(Enrollment.class)) {
                enrollmentRepository.findById(id).ifPresent(e -> docs.addAll(createEnrollmentDocuments(e)));
            }

            if (!docs.isEmpty()) {
                vectorStore.add(docs);
                log.info("Indexed {} documents for {} id {}", docs.size(), clazz.getSimpleName(), id);
            }
        } catch (Exception e) {
            log.error("Failed to sync RAG for {} id {}", clazz.getSimpleName(), id, e);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRagDeleteEvent(com.ttcs.backend.event.RagDeleteEvent event) {
        Class<?> clazz = event.entityClass();
        Long id = event.entityId();
        try {
            log.info("RAG delete triggered for {} with id {}", clazz.getSimpleName(), id);
            String prefix = clazz.getSimpleName().toLowerCase() + "-";
            String docId = prefix + id;
            String uuid = java.util.UUID.nameUUIDFromBytes(docId.getBytes()).toString();
            vectorStore.delete(List.of(uuid));
            log.info("Deleted document from vector store: {}", docId);
        } catch (Exception e) {
            log.error("Failed to delete RAG doc for {} id {}", clazz.getSimpleName(), id, e);
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
                Map.of("courseId", course.getId().toString(), "type", "COURSE")));
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
                            "type", "LESSON")));
        }
        return documents;
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
                        "type", "ASSIGNMENT")));
    }

    private List<Document> createQuestionDocuments(Question q) {
        if (q.getAssignment() == null || q.getAssignment().getCourse() == null) return List.of();
        Course course = q.getAssignment().getCourse();
        Assignment assignment = q.getAssignment();
        StringBuilder qText = new StringBuilder();
        qText.append(String.format(
                "Khóa học: %s\nQuiz: %s\nCâu hỏi %d: %s\nLoại: %s\nĐáp án:\n",
                course.getTitle(), assignment.getTitle(),
                q.getOrderIndex(), q.getContent(), q.getType().name()));
        for (QuestionOption opt : q.getOptions()) {
            qText.append(opt.getIsCorrect() ? "  ✓ " : "  ○ ");
            qText.append(opt.getContent()).append("\n");
        }
        return List.of(createDocument(
                "question-" + q.getId(),
                "QUIZ_QUESTION",
                qText.toString(),
                Map.of("courseId", course.getId().toString(),
                        "assignmentId", assignment.getId().toString(),
                        "questionId", q.getId().toString(),
                        "type", "QUIZ_QUESTION")));
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
                        "userId", sub.getUser().getId().toString(),
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
                        "userId", enrollment.getUser().getId().toString(),
                        "type", "ENROLLMENT")));
    }

    /**
     * Search for relevant documents given a query.
     */
    public List<Document> search(String query, int topK) {
        return vectorStore.similaritySearch(
                SearchRequest.builder()
                        .query(query)
                        .topK(topK)
                        .build());
    }

    /**
     * Build a context string from search results.
     */
    public String buildContext(String query) {
        List<Document> results = search(query, 10);
        if (results.isEmpty()) {
            return "Không tìm thấy thông tin liên quan trong cơ sở dữ liệu.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("══════ DỮ LIỆU TỪ HỆ THỐNG LMS (").append(results.size()).append(" kết quả) ══════\n\n");
        for (int i = 0; i < results.size(); i++) {
            Document doc = results.get(i);
            String type = doc.getMetadata().getOrDefault("type", "UNKNOWN").toString();
            sb.append("--- [").append(type).append("] ---\n");
            sb.append(doc.getText()).append("\n\n");
        }
        return sb.toString();
    }

    // ───── PDF Upload & Index ─────

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
                    Map.of("type", "PDF_DOCUMENT",
                            "fileName", fileName,
                            "chunk", String.valueOf(i),
                            "uploadedBy", user.getFullName())));
        }

        // Batch add to vector store
        int batchSize = 20;
        for (int i = 0; i < documents.size(); i += batchSize) {
            List<Document> batch = documents.subList(i,
                    Math.min(i + batchSize, documents.size()));
            vectorStore.add(batch);
        }

        log.info("PDF indexed: {} → {} chunks", fileName, chunks.size());

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

    // ───── Helpers ─────

    private Document createDocument(String id, String type, String content,
            Map<String, Object> extraMetadata) {
        Map<String, Object> metadata = new HashMap<>(extraMetadata);
        metadata.put("docType", type);
        String uuid = java.util.UUID.nameUUIDFromBytes(id.getBytes()).toString();
        return new Document(uuid, content, metadata);
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
