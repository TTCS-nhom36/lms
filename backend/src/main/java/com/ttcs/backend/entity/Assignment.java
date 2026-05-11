package com.ttcs.backend.entity;

import com.ttcs.backend.enums.AssignmentType;
import com.ttcs.backend.listener.chat.RagEntityListener;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "assignments")
@EntityListeners(RagEntityListener.class)
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Lesson lesson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Course course;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private AssignmentType type;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Builder.Default
    @Column(name = "allow_late", nullable = false)
    private Boolean allowLate = false;

    @Builder.Default
    @Column(name = "max_score", precision = 5, scale = 2, nullable = false)
    private BigDecimal maxScore = BigDecimal.valueOf(10);

    @Builder.Default
    @Column(name = "weight", precision = 5, scale = 2, nullable = false)
    private BigDecimal weight = BigDecimal.valueOf(1.0);

    @Column(name = "time_limit_mins")
    private Integer timeLimitMins;

    @Builder.Default
    @Column(name = "shuffle_questions", nullable = false)
    private Boolean shuffleQuestions = true;

    @Builder.Default
    @Column(name = "shuffle_options", nullable = false)
    private Boolean shuffleOptions = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User createdBy;

    @Builder.Default
    @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Question> questions = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Submission> submissions = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "assignment", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuizAttempt> quizAttempts = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.allowLate == null) {
            this.allowLate = false;
        }
        if (this.maxScore == null) {
            this.maxScore = BigDecimal.valueOf(10);
        }
        if (this.weight == null) {
            this.weight = BigDecimal.valueOf(1.0);
        }
        if (this.shuffleQuestions == null) {
            this.shuffleQuestions = true;
        }
        if (this.shuffleOptions == null) {
            this.shuffleOptions = true;
        }
    }
}
