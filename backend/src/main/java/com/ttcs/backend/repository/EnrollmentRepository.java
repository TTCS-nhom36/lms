package com.ttcs.backend.repository;

import com.ttcs.backend.entity.Enrollment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

	@Override
	@EntityGraph(attributePaths = {"user", "course"})
	List<Enrollment> findAll();

	@Override
	@EntityGraph(attributePaths = {"user", "course"})
	Optional<Enrollment> findById(Long id);

	@EntityGraph(attributePaths = {"user", "course", "course.createdBy"})
	List<Enrollment> findByUserId(java.util.UUID userId);

	@EntityGraph(attributePaths = {"user", "course"})
	List<Enrollment> findByCourseId(Long courseId);

	@EntityGraph(attributePaths = {"user", "course", "course.createdBy"})
	List<Enrollment> findByCourseCreatedById(java.util.UUID createdById);
}
