package com.ttcs.backend.repository;

import com.ttcs.backend.entity.Submission;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {

	@Override
	@EntityGraph(attributePaths = {"assignment", "user", "gradedBy"})
	List<Submission> findAll();

	@Override
	@EntityGraph(attributePaths = {"assignment", "user", "gradedBy"})
	Optional<Submission> findById(Long id);
}
