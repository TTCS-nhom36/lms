package com.ttcs.backend.repository;

import com.ttcs.backend.entity.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionOptionRepository extends JpaRepository<QuestionOption, Long> {
}
