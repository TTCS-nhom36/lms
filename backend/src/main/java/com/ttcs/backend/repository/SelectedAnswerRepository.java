package com.ttcs.backend.repository;

import com.ttcs.backend.entity.SelectedAnswer;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SelectedAnswerRepository extends JpaRepository<SelectedAnswer, Long> {

	@EntityGraph(attributePaths = {"quizAttempt", "question", "selectedOption"})
	List<SelectedAnswer> findByQuizAttemptId(Long attemptId);
}
