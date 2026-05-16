package com.ttcs.backend.repository;

import com.ttcs.backend.entity.Assignment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {

	@Override
	@EntityGraph(attributePaths = {"lesson", "course", "createdBy"})
	List<Assignment> findAll();

	@Override
	@EntityGraph(attributePaths = {"lesson", "course", "createdBy"})
	Optional<Assignment> findById(Long id);

	@EntityGraph(attributePaths = {"course"})
	List<Assignment> findByCourseId(Long courseId);

	@EntityGraph(attributePaths = {"lesson", "course", "createdBy"})
	List<Assignment> findByCourseIdIn(List<Long> courseIds);
}
