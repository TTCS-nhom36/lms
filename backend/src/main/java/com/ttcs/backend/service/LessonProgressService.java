package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.LessonProgressRequest;
import com.ttcs.backend.dto.response.LessonProgressResponse;
import com.ttcs.backend.entity.LessonProgress;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.mapper.LessonProgressMapper;
import com.ttcs.backend.repository.LessonProgressRepository;
import com.ttcs.backend.repository.LessonRepository;
import com.ttcs.backend.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class LessonProgressService {

    private final LessonProgressRepository lessonProgressRepository;
    private final UserRepository userRepository;
    private final LessonRepository lessonRepository;
    private final LessonProgressMapper lessonProgressMapper;

    public LessonProgressService(LessonProgressRepository lessonProgressRepository, UserRepository userRepository, LessonRepository lessonRepository, LessonProgressMapper lessonProgressMapper) {
        this.lessonProgressRepository = lessonProgressRepository;
        this.userRepository = userRepository;
        this.lessonRepository = lessonRepository;
        this.lessonProgressMapper = lessonProgressMapper;
    }

    @Transactional(readOnly = true)
    public List<LessonProgressResponse> findAll() {
        return lessonProgressRepository.findAll().stream().map(lessonProgressMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public LessonProgressResponse findById(Long id) {
        return lessonProgressMapper.toResponse(findLessonProgressEntityById(id));
    }

    public LessonProgressResponse create(LessonProgressRequest request) {
        LessonProgress lessonProgress = lessonProgressMapper.toEntity(request);
        lessonProgress.setUser(findUserById(request.getUserId()));
        lessonProgress.setLesson(lessonRepository.findById(request.getLessonId())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Lesson not found: " + request.getLessonId())));
        return lessonProgressMapper.toResponse(lessonProgressRepository.save(lessonProgress));
    }

    public LessonProgressResponse update(Long id, LessonProgressRequest request) {
        LessonProgress lessonProgress = findLessonProgressEntityById(id);
        lessonProgress.setUser(findUserById(request.getUserId()));
        lessonProgress.setLesson(lessonRepository.findById(request.getLessonId())
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Lesson not found: " + request.getLessonId())));
        lessonProgress.setIsCompleted(request.getIsCompleted());
        lessonProgress.setWatchDurationSecs(request.getWatchDurationSecs());
        lessonProgress.setLastAccessedAt(request.getLastAccessedAt());
        lessonProgress.setCompletedAt(request.getCompletedAt());
        return lessonProgressMapper.toResponse(lessonProgressRepository.save(lessonProgress));
    }

    public void delete(Long id) {
        lessonProgressRepository.delete(findLessonProgressEntityById(id));
    }

    private LessonProgress findLessonProgressEntityById(Long id) {
        return lessonProgressRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "LessonProgress not found: " + id));
    }

    private com.ttcs.backend.entity.User findUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found: " + id));
    }
}
