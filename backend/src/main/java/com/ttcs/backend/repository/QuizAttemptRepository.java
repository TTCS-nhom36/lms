package com.ttcs.backend.repository;

import com.ttcs.backend.entity.QuizAttempt;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {

	@Override
	@EntityGraph(attributePaths = {"user", "assignment"})
	List<QuizAttempt> findAll();

	@Override
	@EntityGraph(attributePaths = {"user", "assignment"})
	Optional<QuizAttempt> findById(Long id);

	@EntityGraph(attributePaths = {"user", "assignment"})
	List<QuizAttempt> findByUserId(UUID userId);

	@EntityGraph(attributePaths = {"user", "assignment"})
	List<QuizAttempt> findByAssignmentId(Long assignmentId);

	@EntityGraph(attributePaths = {"user", "assignment"})
	Optional<QuizAttempt> findByUserIdAndAssignmentId(UUID userId, Long assignmentId);
}
