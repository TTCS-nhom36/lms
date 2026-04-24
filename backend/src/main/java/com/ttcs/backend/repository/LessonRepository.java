package com.ttcs.backend.repository;

import com.ttcs.backend.entity.Lesson;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonRepository extends JpaRepository<Lesson, Long> {

	@Override
	@EntityGraph(attributePaths = {"chapter", "unlockCondition"})
	List<Lesson> findAll();

	@Override
	@EntityGraph(attributePaths = {"chapter", "unlockCondition"})
	Optional<Lesson> findById(Long id);
}
