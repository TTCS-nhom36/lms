package com.ttcs.backend.repository;

import com.ttcs.backend.entity.ChatMessage;
import com.ttcs.backend.entity.User;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    List<ChatMessage> findByUserOrderByCreatedAtAsc(User user);

    void deleteByUser(User user);
}
