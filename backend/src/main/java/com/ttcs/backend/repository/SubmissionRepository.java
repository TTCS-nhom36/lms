package com.ttcs.backend.repository;

import com.ttcs.backend.entity.Submission;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {

	@Override
	@EntityGraph(attributePaths = {"assignment", "user", "gradedBy"})
	List<Submission> findAll();

	@Override
	@EntityGraph(attributePaths = {"assignment", "user", "gradedBy"})
	Optional<Submission> findById(Long id);

	/** Tất cả submission của một học sinh cho một assignment */
	List<Submission> findByUserIdAndAssignmentId(UUID userId, Long assignmentId);

	@EntityGraph(attributePaths = {"assignment"})
	List<Submission> findByUserId(UUID userId);

	/** Submission có finalScore cao nhất (ưu tiên) hoặc autoScore cao nhất */
	@Query("""
		SELECT s FROM Submission s
		WHERE s.user.id = :userId AND s.assignment.id = :assignmentId
		ORDER BY
		    COALESCE(s.finalScore, s.autoScore, 0) DESC,
		    s.submittedAt DESC
		LIMIT 1
		""")
	Optional<Submission> findBestByUserIdAndAssignmentId(
		@Param("userId") UUID userId,
		@Param("assignmentId") Long assignmentId);
}
