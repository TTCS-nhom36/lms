package com.ttcs.backend.repository;

import com.ttcs.backend.entity.Course;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepository extends JpaRepository<Course, Long> {

	@Override
	@EntityGraph(attributePaths = {"createdBy"})
	List<Course> findAll();

	@Override
	@EntityGraph(attributePaths = {"createdBy"})
	Optional<Course> findById(Long id);
}
