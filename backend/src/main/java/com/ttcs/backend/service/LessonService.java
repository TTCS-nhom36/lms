package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.UpdateLessonProgressRequest;
import com.ttcs.backend.dto.request.CreateLessonRequest;
import com.ttcs.backend.dto.response.LessonProgressResponse;
import com.ttcs.backend.dto.response.LessonResponse;
import com.ttcs.backend.entity.Enrollment;
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

@Service
@Transactional
public class LessonService {

    private final LessonRepository lessonRepository;
    private final ChapterRepository chapterRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final LessonMapper lessonMapper;
    private final LessonProgressMapper lessonProgressMapper;

    public LessonService(LessonRepository lessonRepository, ChapterRepository chapterRepository, LessonProgressRepository lessonProgressRepository, EnrollmentRepository enrollmentRepository, UserRepository userRepository, LessonMapper lessonMapper, LessonProgressMapper lessonProgressMapper) {
        this.lessonRepository = lessonRepository;
        this.chapterRepository = chapterRepository;
        this.lessonProgressRepository = lessonProgressRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.userRepository = userRepository;
        this.lessonMapper = lessonMapper;
        this.lessonProgressMapper = lessonProgressMapper;
    }

    @Transactional(readOnly = true)
    public List<LessonResponse> findAll() {
        return lessonRepository.findAll().stream().map(lessonMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<LessonResponse> findByChapterId(Long chapterId) {
        return lessonRepository.findAll().stream()
                .filter(lesson -> lesson.getChapter() != null && chapterId.equals(lesson.getChapter().getId()))
                .map(lessonMapper::toResponse)
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
            return lessonMapper.toResponse(lesson);
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

    public LessonProgressResponse completeLesson(Long lessonId, UUID userId) {
        return updateProgress(lessonId, userId, new UpdateLessonProgressRequest(true, null));
    }

    public LessonProgressResponse updateProgress(Long lessonId, UUID userId, UpdateLessonProgressRequest request) {
        Lesson lesson = findLessonEntityById(lessonId);
        User user = findUserById(userId);
        LessonProgress lessonProgress = lessonProgressRepository.findAll().stream()
                .filter(progress -> progress.getLesson() != null && lessonId.equals(progress.getLesson().getId()))
                .filter(progress -> progress.getUser() != null && userId.equals(progress.getUser().getId()))
                .findFirst()
                .orElseGet(LessonProgress::new);
        lessonProgress.setLesson(lesson);
        lessonProgress.setUser(user);
        lessonProgress.setIsCompleted(request != null && request.getIsCompleted() != null ? request.getIsCompleted() : lessonProgress.getIsCompleted());
        lessonProgress.setWatchDurationSecs(request != null ? request.getWatchDurationSecs() : lessonProgress.getWatchDurationSecs());
        lessonProgress.setLastAccessedAt(java.time.LocalDateTime.now());
        if (Boolean.TRUE.equals(lessonProgress.getIsCompleted()) && lessonProgress.getCompletedAt() == null) {
            lessonProgress.setCompletedAt(java.time.LocalDateTime.now());
        }
        return lessonProgressMapper.toResponse(lessonProgressRepository.save(lessonProgress));
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
