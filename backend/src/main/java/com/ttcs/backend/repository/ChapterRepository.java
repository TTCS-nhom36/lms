package com.ttcs.backend.repository;

import com.ttcs.backend.entity.Chapter;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChapterRepository extends JpaRepository<Chapter, Long> {

	@Override
	@EntityGraph(attributePaths = {"course"})
	List<Chapter> findAll();

	@Override
	@EntityGraph(attributePaths = {"course"})
	Optional<Chapter> findById(Long id);

	@EntityGraph(attributePaths = {"course", "lessons"})
	List<Chapter> findByCourseIdOrderByOrderIndex(Long courseId);
}
