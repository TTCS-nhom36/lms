package com.ttcs.backend.repository;

import com.ttcs.backend.entity.LessonProgress;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, Long> {

	@Override
	@EntityGraph(attributePaths = {"user", "lesson"})
	List<LessonProgress> findAll();

	@Override
	@EntityGraph(attributePaths = {"user", "lesson"})
	Optional<LessonProgress> findById(Long id);
}
