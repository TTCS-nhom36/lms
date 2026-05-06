package com.ttcs.backend.repository;

import com.ttcs.backend.entity.Question;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionRepository extends JpaRepository<Question, Long> {

	@Override
	@EntityGraph(attributePaths = {"assignment"})
	List<Question> findAll();

	@Override
	@EntityGraph(attributePaths = {"assignment", "options"})
	Optional<Question> findById(Long id);
}
