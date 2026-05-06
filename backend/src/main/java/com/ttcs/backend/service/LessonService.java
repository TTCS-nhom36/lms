package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.UpdateLessonProgressRequest;
import com.ttcs.backend.dto.request.CreateLessonRequest;
import com.ttcs.backend.dto.response.LessonProgressResponse;
import com.ttcs.backend.dto.response.LessonResponse;
import com.ttcs.backend.entity.Chapter;
import com.ttcs.backend.entity.LessonProgress;
import com.ttcs.backend.entity.Lesson;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.mapper.LessonMapper;
import com.ttcs.backend.mapper.LessonProgressMapper;
import com.ttcs.backend.repository.ChapterRepository;
import com.ttcs.backend.repository.EnrollmentRepository;
import com.ttcs.backend.repository.LessonRepository;
import com.ttcs.backend.repository.LessonProgressRepository;
import com.ttcs.backend.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class LessonService {

    private static final long MAX_DOCUMENT_SIZE = 25 * 1024 * 1024L; // 25 MB

    private final LessonRepository lessonRepository;
    private final ChapterRepository chapterRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final LessonMapper lessonMapper;
    private final LessonProgressMapper lessonProgressMapper;
    private final S3Service s3Service;

    public LessonService(LessonRepository lessonRepository, ChapterRepository chapterRepository, LessonProgressRepository lessonProgressRepository, EnrollmentRepository enrollmentRepository, UserRepository userRepository, LessonMapper lessonMapper, LessonProgressMapper lessonProgressMapper, S3Service s3Service) {
        this.lessonRepository = lessonRepository;
        this.chapterRepository = chapterRepository;
        this.lessonProgressRepository = lessonProgressRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.userRepository = userRepository;
        this.lessonMapper = lessonMapper;
        this.lessonProgressMapper = lessonProgressMapper;
        this.s3Service = s3Service;
    }

    @Transactional(readOnly = true)
    public List<LessonResponse> findAll() {
        return lessonRepository.findAll().stream().map(lessonMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<LessonResponse> findByChapterId(Long chapterId, UUID userId) {
        return lessonRepository.findAll().stream()
                .filter(lesson -> lesson.getChapter() != null && chapterId.equals(lesson.getChapter().getId()))
                .map(lesson -> {
                    LessonProgress progress = null;
                    if (userId != null) {
                        progress = lessonProgressRepository.findByLessonIdAndUserId(lesson.getId(), userId).orElse(null);
                    }
                    return lessonMapper.toResponse(lesson, progress);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public LessonResponse findById(Long id) {
        return lessonMapper.toResponse(findLessonEntityById(id));
    }

    @Transactional(readOnly = true)
    public LessonResponse findAccessibleById(Long id, UUID userId) {
        Lesson lesson = findLessonEntityById(id);
        if (Boolean.TRUE.equals(lesson.getIsFreePreview()) || hasAccess(lesson, userId)) {
            LessonProgress progress = null;
            if (userId != null) {
                progress = lessonProgressRepository.findByLessonIdAndUserId(id, userId).orElse(null);
            }
            return lessonMapper.toResponse(lesson, progress);
        }
        throw new AppException(ErrorCode.ACCESS_DENIED, "Lesson requires enrollment");
    }

    public LessonResponse create(CreateLessonRequest request) {
        Lesson lesson = lessonMapper.toEntity(request);
        lesson.setChapter(findChapterById(request.getChapterId()));
        if (request.getUnlockConditionId() != null) {
            lesson.setUnlockCondition(findLessonEntityById(request.getUnlockConditionId()));
        }
        return lessonMapper.toResponse(lessonRepository.save(lesson));
    }

    public LessonResponse createForChapter(Long chapterId, CreateLessonRequest request) {
        request.setChapterId(chapterId);
        return create(request);
    }

    public LessonResponse update(Long id, CreateLessonRequest request) {
        Lesson lesson = findLessonEntityById(id);
        lesson.setChapter(findChapterById(request.getChapterId()));
        lesson.setTitle(request.getTitle());
        lesson.setContentType(request.getContentType());
        lesson.setContentUrl(request.getContentUrl());
        lesson.setContentText(request.getContentText());
        lesson.setOrderIndex(request.getOrderIndex());
        lesson.setUnlockCondition(request.getUnlockConditionId() != null ? findLessonEntityById(request.getUnlockConditionId()) : null);
        lesson.setIsFreePreview(request.getIsFreePreview());
        return lessonMapper.toResponse(lessonRepository.save(lesson));
    }

    public void delete(Long id) {
        lessonRepository.delete(findLessonEntityById(id));
    }

    /**
     * Upload a PDF document to S3.
     * Validates: only application/pdf, max 25 MB.
     *
     * @param file the uploaded file
     * @return S3 key of the stored document
     */
    public String uploadDocument(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "No file provided");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.equals("application/pdf")) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Only PDF files are accepted");
        }
        if (file.getSize() > MAX_DOCUMENT_SIZE) {
            throw new AppException(ErrorCode.BAD_REQUEST, "File size must not exceed 25 MB");
        }
        return s3Service.uploadFile(file, "lesson-documents");
    }

    /**
     * Generate a presigned download URL for a DOCUMENT lesson.
     * Checks that the user has access to the lesson.
     *
     * @param lessonId the lesson ID
     * @param userId   the requesting user (may be null for unauthenticated)
     * @return presigned S3 URL valid for 1 hour
     */
    @Transactional(readOnly = true)
    public String getDocumentPresignedUrl(Long lessonId, UUID userId) {
        Lesson lesson = findLessonEntityById(lessonId);
        if (!Boolean.TRUE.equals(lesson.getIsFreePreview()) && !hasAccess(lesson, userId)) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Lesson requires enrollment");
        }
        String s3Key = lesson.getContentUrl();
        if (s3Key == null || s3Key.isBlank()) {
            throw new AppException(ErrorCode.NOT_FOUND, "No document attached to this lesson");
        }
        return s3Service.getPresignedUrl(s3Key);
    }

    public LessonProgressResponse completeLesson(Long lessonId, UUID userId) {
        return updateProgress(lessonId, userId, new UpdateLessonProgressRequest(true, null));
    }

    public LessonProgressResponse updateProgress(Long lessonId, UUID userId, UpdateLessonProgressRequest request) {
        Lesson lesson = findLessonEntityById(lessonId);
        User user = findUserById(userId);
        LessonProgress lessonProgress = lessonProgressRepository.findByLessonIdAndUserId(lessonId, userId)
                .orElseGet(LessonProgress::new);
        lessonProgress.setLesson(lesson);
        lessonProgress.setUser(user);
        
        if (request != null && request.getIsCompleted() != null) {
            lessonProgress.setIsCompleted(request.getIsCompleted());
        } else if (lessonProgress.getIsCompleted() == null) {
            lessonProgress.setIsCompleted(false);
        }
        
        if (request != null && request.getWatchDurationSecs() != null) {
            lessonProgress.setWatchDurationSecs(request.getWatchDurationSecs());
        } else if (lessonProgress.getWatchDurationSecs() == null) {
            lessonProgress.setWatchDurationSecs(0);
        }
        
        lessonProgress.setLastAccessedAt(java.time.LocalDateTime.now());
        if (Boolean.TRUE.equals(lessonProgress.getIsCompleted()) && lessonProgress.getCompletedAt() == null) {
            lessonProgress.setCompletedAt(java.time.LocalDateTime.now());
        }
        return lessonProgressMapper.toResponse(lessonProgressRepository.saveAndFlush(lessonProgress));
    }

    private Lesson findLessonEntityById(Long id) {
        return lessonRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Lesson not found: " + id));
    }

    private Chapter findChapterById(Long id) {
        return chapterRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Chapter not found: " + id));
    }

    private User findUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found: " + id));
    }

    private boolean hasAccess(Lesson lesson, UUID userId) {
        if (userId == null || lesson.getChapter() == null || lesson.getChapter().getCourse() == null) {
            return false;
        }
        Long courseId = lesson.getChapter().getCourse().getId();
        return enrollmentRepository.findAll().stream()
                .anyMatch(enrollment -> enrollment.getUser() != null
                        && userId.equals(enrollment.getUser().getId())
                        && enrollment.getCourse() != null
                        && courseId.equals(enrollment.getCourse().getId()));
    }
}
