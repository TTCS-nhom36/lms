package com.ttcs.backend.repository;

import com.ttcs.backend.entity.LessonProgress;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {

	@Override
	@EntityGraph(attributePaths = {"user", "lesson", "lesson.chapter", "lesson.chapter.course"})
	List<LessonProgress> findAll();

	@EntityGraph(attributePaths = {"user", "lesson", "lesson.chapter", "lesson.chapter.course"})
	Optional<LessonProgress> findByLessonIdAndUserId(Long lessonId, UUID userId);

	@EntityGraph(attributePaths = {"lesson", "lesson.chapter", "lesson.chapter.course"})
	List<LessonProgress> findByUserId(UUID userId);
}
