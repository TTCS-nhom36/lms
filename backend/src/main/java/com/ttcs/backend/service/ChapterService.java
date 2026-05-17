package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.CreateChapterRequest;
import com.ttcs.backend.dto.request.ChapterReorderRequest;
import com.ttcs.backend.dto.response.ChapterResponse;
import com.ttcs.backend.entity.Chapter;
import com.ttcs.backend.entity.Course;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.mapper.ChapterMapper;
import com.ttcs.backend.repository.ChapterRepository;
import com.ttcs.backend.repository.CourseRepository;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ChapterService {

    private final ChapterRepository chapterRepository;
    private final CourseRepository courseRepository;
    private final ChapterMapper chapterMapper;
    private final CurrentUserService currentUserService;

    public ChapterService(ChapterRepository chapterRepository, CourseRepository courseRepository, ChapterMapper chapterMapper, CurrentUserService currentUserService) {
        this.chapterRepository = chapterRepository;
        this.courseRepository = courseRepository;
        this.chapterMapper = chapterMapper;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<ChapterResponse> findAll() {
        return chapterRepository.findAll().stream().map(chapterMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ChapterResponse> findByCourseId(Long courseId) {
        return chapterRepository.findByCourseIdOrderByOrderIndex(courseId).stream()
                .map(chapterMapper::toResponse)
                .sorted((left, right) -> Integer.compare(
                        left.getOrderIndex() != null ? left.getOrderIndex() : Integer.MAX_VALUE,
                        right.getOrderIndex() != null ? right.getOrderIndex() : Integer.MAX_VALUE))
                .toList();
    }

    @Transactional(readOnly = true)
    public ChapterResponse findById(Long id) {
        return chapterMapper.toResponse(findChapterEntityById(id));
    }

    public ChapterResponse create(CreateChapterRequest request) {
        Chapter chapter = chapterMapper.toEntity(request);
        Course course = findCourseEntityById(request.getCourseId());
        assertCanManageCourse(course);
        chapter.setCourse(course);
        return chapterMapper.toResponse(chapterRepository.save(chapter));
    }

    public ChapterResponse createForCourse(Long courseId, CreateChapterRequest request) {
        request.setCourseId(courseId);
        return create(request);
    }

    public ChapterResponse update(Long id, CreateChapterRequest request) {
        Chapter chapter = findChapterEntityById(id);
        assertCanManageCourse(chapter.getCourse());
        Course course = request.getCourseId() != null ? findCourseEntityById(request.getCourseId()) : chapter.getCourse();
        assertCanManageCourse(course);
        chapter.setCourse(course);
        chapter.setTitle(request.getTitle());
        chapter.setOrderIndex(request.getOrderIndex());
        return chapterMapper.toResponse(chapterRepository.save(chapter));
    }

    public void delete(Long id) {
        Chapter chapter = findChapterEntityById(id);
        assertCanManageCourse(chapter.getCourse());
        chapterRepository.delete(chapter);
    }

    public List<ChapterResponse> reorder(Long courseId, ChapterReorderRequest request) {
        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Course not found: " + courseId));
        assertCanManageCourse(course);
        List<Long> chapterIds = request != null && request.getChapterIds() != null ? request.getChapterIds() : List.of();
        List<Chapter> chapters = chapterRepository.findByCourseIdOrderByOrderIndex(courseId).stream()
                .filter(chapter -> chapterIds.contains(chapter.getId()))
                .toList();
        for (int index = 0; index < chapterIds.size(); index++) {
            Long chapterId = chapterIds.get(index);
            Chapter chapter = chapters.stream().filter(item -> Objects.equals(item.getId(), chapterId)).findFirst().orElse(null);
            if (chapter != null) {
                chapter.setOrderIndex(index + 1);
                chapter.setCourse(course);
                chapterRepository.save(chapter);
            }
        }
        return findByCourseId(courseId);
    }

    private Chapter findChapterEntityById(Long id) {
        return chapterRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Chapter not found: " + id));
    }

    private Course findCourseEntityById(Long id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Course not found: " + id));
    }

    private void assertCanManageCourse(Course course) {
        if (course == null) {
            throw new AppException(ErrorCode.NOT_FOUND, "Course not found");
        }
        if (currentUserService.hasRole("ADMIN")) {
            return;
        }
        java.util.UUID currentUserId = currentUserService.getCurrentUserId();
        if (course.getCreatedBy() != null && currentUserId.equals(course.getCreatedBy().getId())) {
            return;
        }
        throw new AppException(ErrorCode.ACCESS_DENIED, "You are not allowed to manage this course");
    }
}
