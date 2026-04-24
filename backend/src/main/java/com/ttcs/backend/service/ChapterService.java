package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.CreateChapterRequest;
import com.ttcs.backend.dto.request.ChapterReorderRequest;
import com.ttcs.backend.dto.response.ChapterResponse;
import com.ttcs.backend.entity.Chapter;
import com.ttcs.backend.entity.Course;
import com.ttcs.backend.mapper.ChapterMapper;
import com.ttcs.backend.repository.ChapterRepository;
import com.ttcs.backend.repository.CourseRepository;
import java.util.List;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ChapterService {

    private final ChapterRepository chapterRepository;
    private final CourseRepository courseRepository;
    private final ChapterMapper chapterMapper;

    public ChapterService(ChapterRepository chapterRepository, CourseRepository courseRepository, ChapterMapper chapterMapper) {
        this.chapterRepository = chapterRepository;
        this.courseRepository = courseRepository;
        this.chapterMapper = chapterMapper;
    }

    @Transactional(readOnly = true)
    public List<ChapterResponse> findAll() {
        return chapterRepository.findAll().stream().map(chapterMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ChapterResponse> findByCourseId(Long courseId) {
        return chapterRepository.findAll().stream()
                .filter(chapter -> chapter.getCourse() != null && courseId.equals(chapter.getCourse().getId()))
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
        chapter.setCourse(courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found: " + request.getCourseId())));
        return chapterMapper.toResponse(chapterRepository.save(chapter));
    }

    public ChapterResponse createForCourse(Long courseId, CreateChapterRequest request) {
        request.setCourseId(courseId);
        return create(request);
    }

    public ChapterResponse update(Long id, CreateChapterRequest request) {
        Chapter chapter = findChapterEntityById(id);
        chapter.setCourse(courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found: " + request.getCourseId())));
        chapter.setTitle(request.getTitle());
        chapter.setOrderIndex(request.getOrderIndex());
        return chapterMapper.toResponse(chapterRepository.save(chapter));
    }

    public void delete(Long id) {
        chapterRepository.delete(findChapterEntityById(id));
    }

    public List<ChapterResponse> reorder(Long courseId, ChapterReorderRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found: " + courseId));
        List<Long> chapterIds = request != null && request.getChapterIds() != null ? request.getChapterIds() : List.of();
        List<Chapter> chapters = chapterRepository.findAll().stream()
                .filter(chapter -> chapter.getCourse() != null && courseId.equals(chapter.getCourse().getId()))
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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chapter not found: " + id));
    }
}
