package com.ttcs.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Index;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;


import com.ttcs.backend.listener.chat.RagEntityListener;
import jakarta.persistence.EntityListeners;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "submissions", indexes = {
    @Index(name = "idx_submission_user_assignment", columnList = "user_id, assignment_id")
})
@EntityListeners(RagEntityListener.class)
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Assignment assignment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Builder.Default
    @Column(name = "is_late", nullable = false)
    private Boolean isLate = false;

    @Column(name = "file_url", columnDefinition = "TEXT")
    private String fileUrl;

    @Column(name = "link_url", columnDefinition = "TEXT")
    private String linkUrl;

    @Column(name = "auto_score", precision = 5, scale = 2)
    private BigDecimal autoScore;

    @Column(name = "manual_score", precision = 5, scale = 2)
    private BigDecimal manualScore;

    @Column(name = "final_score", precision = 5, scale = 2)
    private BigDecimal finalScore;

    @Column(name = "feedback", columnDefinition = "TEXT")
    private String feedback;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "graded_by")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User gradedBy;

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "quiz_attempt_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private QuizAttempt quizAttempt;

    @Column(name = "graded_at")
    private LocalDateTime gradedAt;

    @PrePersist
    protected void onCreate() {
        if (this.submittedAt == null) {
            this.submittedAt = LocalDateTime.now();
        }
        if (this.isLate == null) {
            this.isLate = false;
        }
    }
}
