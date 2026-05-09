package com.ttcs.backend.service;

import com.ttcs.backend.dto.response.stats.AdminSummaryResponse;
import com.ttcs.backend.dto.response.stats.AssignmentSubmissionStatResponse;
import com.ttcs.backend.dto.response.stats.CourseOverviewResponse;
import com.ttcs.backend.dto.response.stats.LessonCompletionStatResponse;
import com.ttcs.backend.dto.response.stats.ScoreDistributionBucketResponse;
import com.ttcs.backend.dto.response.stats.StudentAttendanceResponse;
import com.ttcs.backend.dto.response.stats.StudentCourseProgressResponse;
import com.ttcs.backend.dto.response.stats.StudentProgressResponse;
import com.ttcs.backend.dto.response.stats.StudentScoreItemResponse;
import com.ttcs.backend.dto.response.stats.StudentScoresResponse;
import com.ttcs.backend.entity.Assignment;
import com.ttcs.backend.entity.Course;
import com.ttcs.backend.entity.Enrollment;
import com.ttcs.backend.entity.Lesson;
import com.ttcs.backend.entity.LessonProgress;
import com.ttcs.backend.entity.Submission;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.enums.CourseStatus;
import com.ttcs.backend.enums.EnrollmentStatus;
import com.ttcs.backend.enums.UserRole;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.repository.AssignmentRepository;
import com.ttcs.backend.repository.CourseRepository;
import com.ttcs.backend.repository.EnrollmentRepository;
import com.ttcs.backend.repository.LessonProgressRepository;
import com.ttcs.backend.repository.LessonRepository;
import com.ttcs.backend.repository.SubmissionRepository;
import com.ttcs.backend.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class StatsService {

	private final CourseRepository courseRepository;
	private final EnrollmentRepository enrollmentRepository;
	private final LessonRepository lessonRepository;
	private final LessonProgressRepository lessonProgressRepository;
	private final AssignmentRepository assignmentRepository;
	private final SubmissionRepository submissionRepository;
	private final UserRepository userRepository;

	public StatsService(CourseRepository courseRepository,
			EnrollmentRepository enrollmentRepository,
			LessonRepository lessonRepository,
			LessonProgressRepository lessonProgressRepository,
			AssignmentRepository assignmentRepository,
			SubmissionRepository submissionRepository,
			UserRepository userRepository) {
		this.courseRepository = courseRepository;
		this.enrollmentRepository = enrollmentRepository;
		this.lessonRepository = lessonRepository;
		this.lessonProgressRepository = lessonProgressRepository;
		this.assignmentRepository = assignmentRepository;
		this.submissionRepository = submissionRepository;
		this.userRepository = userRepository;
	}

	public CourseOverviewResponse getCourseOverview(Long courseId) {
		CourseSnapshot snapshot = loadCourseSnapshot(courseId);
		long totalPossibleLessonCompletions = snapshot.activeEnrollments.size() * snapshot.lessons.size();
		long totalPossibleSubmissions = snapshot.activeEnrollments.size() * snapshot.assignments.size();
		double lessonCompletionRate = rate(snapshot.completedLessonProgress.size(), totalPossibleLessonCompletions);
		double submissionRate = rate(snapshot.submissions.size(), totalPossibleSubmissions);
		double averageScore = averageScore(snapshot.submissions);
		long averageWatchDurationSecs = averageWatchDuration(snapshot.activeEnrollments, snapshot.progresses);
		double activeViewerRate = rate(countActiveViewers(snapshot.activeEnrollments, snapshot.progresses), snapshot.activeEnrollments.size());
		return new CourseOverviewResponse(
				snapshot.course.getId(),
				snapshot.course.getTitle(),
				snapshot.activeEnrollments.size(),
				snapshot.lessons.size(),
				snapshot.assignments.size(),
				snapshot.completedLessonProgress.size(),
				snapshot.submissions.size(),
				lessonCompletionRate,
				submissionRate,
				averageScore,
				averageWatchDurationSecs,
				activeViewerRate
		);
	}

	public List<LessonCompletionStatResponse> getLessonCompletionStats(Long courseId) {
		CourseSnapshot snapshot = loadCourseSnapshot(courseId);
		return snapshot.lessons.stream()
				.sorted(Comparator.comparing(Lesson::getOrderIndex, Comparator.nullsLast(Comparator.naturalOrder())))
				.map(lesson -> {
					long completedCount = snapshot.progresses.stream()
						.filter(progress -> progress.getLesson() != null && lesson.getId().equals(progress.getLesson().getId()))
						.filter(progress -> Boolean.TRUE.equals(progress.getIsCompleted()))
						.count();
					return new LessonCompletionStatResponse(
							lesson.getId(),
							lesson.getTitle(),
							completedCount,
							snapshot.activeEnrollments.size(),
							rate(completedCount, snapshot.activeEnrollments.size())
					);
				})
				.toList();
	}

	public List<AssignmentSubmissionStatResponse> getSubmissionRateStats(Long courseId) {
		CourseSnapshot snapshot = loadCourseSnapshot(courseId);
		return snapshot.assignments.stream()
				.sorted(Comparator.comparing(Assignment::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())))
				.map(assignment -> {
					long submittedCount = snapshot.submissions.stream()
						.filter(submission -> submission.getAssignment() != null && assignment.getId().equals(submission.getAssignment().getId()))
						.count();
					return new AssignmentSubmissionStatResponse(
							assignment.getId(),
							assignment.getTitle(),
							assignment.getType(),
							submittedCount,
							snapshot.activeEnrollments.size(),
							rate(submittedCount, snapshot.activeEnrollments.size())
					);
				})
				.toList();
	}

	public List<ScoreDistributionBucketResponse> getScoreDistributionStats(Long courseId) {
		CourseSnapshot snapshot = loadCourseSnapshot(courseId);
		var buckets = new LinkedHashMap<String, Long>();
		buckets.put("< 5", 0L);
		buckets.put("5 - 6", 0L);
		buckets.put("6 - 7", 0L);
		buckets.put("7 - 8", 0L);
		buckets.put("8 - 9", 0L);
		buckets.put("9 - 10", 0L);
		for (Submission submission : snapshot.submissions) {
			String bucket = bucketForScore10(scoreOn10Scale(submission));
			buckets.put(bucket, buckets.get(bucket) + 1);
		}
		long total = snapshot.submissions.size();
		return buckets.entrySet().stream()
				.map(entry -> new ScoreDistributionBucketResponse(
						entry.getKey(),
						entry.getValue(),
						total == 0 ? 0.0 : round(entry.getValue() * 100.0 / total)
					))
				.toList();
	}

	public List<StudentAttendanceResponse> getAttendanceStats(Long courseId) {
		CourseSnapshot snapshot = loadCourseSnapshot(courseId);
		return snapshot.activeEnrollments.stream()
				.map(enrollment -> {
					UUID userId = enrollment.getUser().getId();
					List<LessonProgress> userProgresses = snapshot.progresses.stream()
						.filter(progress -> progress.getUser() != null && userId.equals(progress.getUser().getId()))
						.toList();
					long watchDurationSecs = userProgresses.stream().mapToLong(progress -> progress.getWatchDurationSecs() != null ? progress.getWatchDurationSecs() : 0).sum();
					long completedLessons = userProgresses.stream().filter(progress -> Boolean.TRUE.equals(progress.getIsCompleted())).count();
					LocalDateTime lastAccessedAt = userProgresses.stream()
						.map(LessonProgress::getLastAccessedAt)
						.filter(java.util.Objects::nonNull)
						.max(Comparator.naturalOrder())
						.orElse(null);
					return new StudentAttendanceResponse(
							userId,
							enrollment.getUser().getFullName(),
							enrollment.getUser().getEmail(),
							watchDurationSecs,
							completedLessons,
							snapshot.lessons.size(),
							rate(completedLessons, snapshot.lessons.size()),
							lastAccessedAt
					);
				})
				.sorted(Comparator.comparingLong(StudentAttendanceResponse::watchDurationSecs).reversed())
				.toList();
	}

	public StudentProgressResponse getStudentProgress(UUID studentId) {
		User student = findStudent(studentId);
		List<Enrollment> enrollments = enrollmentRepository.findAll().stream()
				.filter(enrollment -> enrollment.getUser() != null && studentId.equals(enrollment.getUser().getId()))
				.filter(enrollment -> enrollment.getStatus() != EnrollmentStatus.DROPPED)
				.toList();
		List<StudentCourseProgressResponse> courseProgresses = enrollments.stream()
				.map(enrollment -> buildStudentCourseProgress(studentId, enrollment.getCourse()))
				.toList();
		long totalCourses = courseProgresses.size();
		long completedCourses = courseProgresses.stream().filter(progress -> progress.progressRate() >= 100.0).count();
		double overallProgress = totalCourses == 0 ? 0.0 : round(courseProgresses.stream().mapToDouble(StudentCourseProgressResponse::progressRate).average().orElse(0.0));
		return new StudentProgressResponse(student.getId(), student.getFullName(), student.getEmail(), totalCourses, completedCourses, overallProgress, courseProgresses);
	}

	public StudentScoresResponse getStudentScores(UUID studentId) {
		User student = findStudent(studentId);
		List<Submission> submissions = submissionRepository.findAll().stream()
				.filter(submission -> submission.getUser() != null && studentId.equals(submission.getUser().getId()))
				.sorted(Comparator.comparing(Submission::getSubmittedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
				.toList();
		List<StudentScoreItemResponse> items = submissions.stream()
				.map(submission -> new StudentScoreItemResponse(
						submission.getAssignment() != null ? submission.getAssignment().getId() : null,
						submission.getAssignment() != null ? submission.getAssignment().getTitle() : null,
						submission.getAssignment() != null && submission.getAssignment().getCourse() != null ? submission.getAssignment().getCourse().getId() : null,
						submission.getAssignment() != null && submission.getAssignment().getCourse() != null ? submission.getAssignment().getCourse().getTitle() : null,
						resolveFinalScore(submission),
						submission.getAssignment() != null ? submission.getAssignment().getMaxScore() : null,
						scorePercent(submission),
						submission.getSubmittedAt(),
						submission.getGradedAt(),
						submission.getIsLate()
					))
				.toList();
		return new StudentScoresResponse(student.getId(), student.getFullName(), student.getEmail(), averageScoreBigDecimal(submissions), items);
	}

	public AdminSummaryResponse getAdminSummary() {
		List<Course> courses = courseRepository.findAll();
		List<Enrollment> enrollments = enrollmentRepository.findAll();
		List<Assignment> assignments = assignmentRepository.findAll();
		List<Submission> submissions = submissionRepository.findAll();
		List<User> users = userRepository.findAll();
		long activeUsers = users.stream().filter(user -> Boolean.TRUE.equals(user.getIsActive())).count();
		long students = users.stream().filter(user -> user.getRole() == UserRole.STUDENT).count();
		long instructors = users.stream().filter(user -> user.getRole() == UserRole.INSTRUCTOR).count();
		long publishedCourses = courses.stream().filter(course -> course.getStatus() == CourseStatus.PUBLISHED).count();
		long draftCourses = courses.stream().filter(course -> course.getStatus() == CourseStatus.DRAFT).count();
		double averageCompletionRate = courses.isEmpty() ? 0.0 : round(courses.stream().mapToDouble(course -> getCourseOverview(course.getId()).lessonCompletionRate()).average().orElse(0.0));
		return new AdminSummaryResponse(
				users.size(),
				activeUsers,
				students,
				instructors,
				courses.size(),
				publishedCourses,
				draftCourses,
				enrollments.size(),
				assignments.size(),
				submissions.size(),
				averageScore(submissions),
				averageCompletionRate
		);
	}

	private CourseSnapshot loadCourseSnapshot(Long courseId) {
		Course course = courseRepository.findById(courseId)
				.orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "Course not found: " + courseId));
		List<Enrollment> activeEnrollments = enrollmentRepository.findAll().stream()
				.filter(enrollment -> enrollment.getCourse() != null && courseId.equals(enrollment.getCourse().getId()))
				.filter(enrollment -> enrollment.getStatus() == EnrollmentStatus.ACTIVE)
				.toList();
		List<Lesson> lessons = lessonRepository.findAll().stream()
				.filter(lesson -> lesson.getChapter() != null
						&& lesson.getChapter().getCourse() != null
						&& courseId.equals(lesson.getChapter().getCourse().getId()))
				.toList();
		List<Assignment> assignments = assignmentRepository.findAll().stream()
				.filter(assignment -> assignment.getCourse() != null && courseId.equals(assignment.getCourse().getId()))
				.toList();
		List<LessonProgress> progresses = lessonProgressRepository.findAll().stream()
				.filter(progress -> progress.getUser() != null && activeEnrollments.stream().anyMatch(enrollment -> enrollment.getUser() != null && enrollment.getUser().getId().equals(progress.getUser().getId())))
				.filter(progress -> progress.getLesson() != null
						&& progress.getLesson().getChapter() != null
						&& progress.getLesson().getChapter().getCourse() != null
						&& courseId.equals(progress.getLesson().getChapter().getCourse().getId()))
				.toList();
		List<LessonProgress> completedLessonProgress = progresses.stream()
				.filter(progress -> Boolean.TRUE.equals(progress.getIsCompleted()))
				.toList();
		List<Submission> submissions = submissionRepository.findAll().stream()
				.filter(submission -> submission.getAssignment() != null
						&& submission.getAssignment().getCourse() != null
						&& courseId.equals(submission.getAssignment().getCourse().getId()))
				.filter(submission -> submission.getUser() != null && activeEnrollments.stream().anyMatch(enrollment -> enrollment.getUser() != null && enrollment.getUser().getId().equals(submission.getUser().getId())))
				.toList();
		return new CourseSnapshot(course, activeEnrollments, lessons, assignments, progresses, completedLessonProgress, submissions);
	}

	private StudentCourseProgressResponse buildStudentCourseProgress(UUID studentId, Course course) {
		if (course == null) {
			return new StudentCourseProgressResponse(null, null, 0, 0, 0, 0, 0.0, 0.0);
		}
		List<Lesson> lessons = lessonRepository.findAll().stream()
				.filter(lesson -> lesson.getChapter() != null
						&& lesson.getChapter().getCourse() != null
						&& course.getId().equals(lesson.getChapter().getCourse().getId()))
				.toList();
		List<Assignment> assignments = assignmentRepository.findAll().stream()
				.filter(assignment -> assignment.getCourse() != null && course.getId().equals(assignment.getCourse().getId()))
				.toList();
		List<LessonProgress> progresses = lessonProgressRepository.findAll().stream()
				.filter(progress -> progress.getUser() != null && studentId.equals(progress.getUser().getId()))
				.filter(progress -> progress.getLesson() != null
						&& progress.getLesson().getChapter() != null
						&& progress.getLesson().getChapter().getCourse() != null
						&& course.getId().equals(progress.getLesson().getChapter().getCourse().getId()))
				.toList();
		List<Submission> submissions = submissionRepository.findAll().stream()
				.filter(submission -> submission.getUser() != null && studentId.equals(submission.getUser().getId()))
				.filter(submission -> submission.getAssignment() != null
						&& submission.getAssignment().getCourse() != null
						&& course.getId().equals(submission.getAssignment().getCourse().getId()))
				.toList();
		long completedLessons = progresses.stream().filter(progress -> Boolean.TRUE.equals(progress.getIsCompleted())).count();
		long submittedAssignments = submissions.stream()
				.map(submission -> submission.getAssignment() != null ? submission.getAssignment().getId() : null)
				.filter(java.util.Objects::nonNull)
				.distinct()
				.count();
		long totalLessons = lessons.size();
		long totalAssignments = assignments.size();
		double progressRate = totalLessons == 0 ? 0.0 : rate(completedLessons, totalLessons);
		double score = averageScore(submissions);
		return new StudentCourseProgressResponse(course.getId(), course.getTitle(), completedLessons, totalLessons, submittedAssignments, totalAssignments, progressRate, score);
	}

	private User findStudent(UUID studentId) {
		User student = userRepository.findById(studentId)
				.orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found: " + studentId));
		if (student.getRole() != UserRole.STUDENT) {
			throw new AppException(ErrorCode.BAD_REQUEST, "User is not a student: " + studentId);
		}
		return student;
	}

	private long countActiveViewers(List<Enrollment> activeEnrollments, List<LessonProgress> progresses) {
		return activeEnrollments.stream()
				.map(Enrollment::getUser)
				.filter(user -> progresses.stream().anyMatch(progress -> progress.getUser() != null
						&& user.getId().equals(progress.getUser().getId())
						&& (Boolean.TRUE.equals(progress.getIsCompleted())
							|| (progress.getWatchDurationSecs() != null && progress.getWatchDurationSecs() > 0))))
				.count();
	}

	private long averageWatchDuration(List<Enrollment> activeEnrollments, List<LessonProgress> progresses) {
		if (activeEnrollments.isEmpty()) {
			return 0L;
		}
		double average = activeEnrollments.stream()
				.mapToLong(enrollment -> {
					UUID userId = enrollment.getUser().getId();
					return progresses.stream()
						.filter(progress -> progress.getUser() != null && userId.equals(progress.getUser().getId()))
						.mapToLong(progress -> progress.getWatchDurationSecs() != null ? progress.getWatchDurationSecs() : 0)
						.sum();
				})
				.average()
				.orElse(0.0);
		return Math.round(average);
	}

	private double averageScore(List<Submission> submissions) {
		if (submissions.isEmpty()) {
			return 0.0;
		}
		BigDecimal total = BigDecimal.ZERO;
		long count = 0;
		for (Submission submission : submissions) {
			BigDecimal score = resolveFinalScore(submission);
			if (score != null) {
				total = total.add(score);
				count++;
			}
		}
		if (count == 0) {
			return 0.0;
		}
		return round(total.divide(BigDecimal.valueOf(count), 4, RoundingMode.HALF_UP).doubleValue());
	}

	private BigDecimal averageScoreBigDecimal(List<Submission> submissions) {
		return BigDecimal.valueOf(averageScore(submissions)).setScale(2, RoundingMode.HALF_UP);
	}

	private BigDecimal resolveFinalScore(Submission submission) {
		if (submission.getFinalScore() != null) {
			return submission.getFinalScore();
		}
		if (submission.getManualScore() != null) {
			return submission.getManualScore();
		}
		if (submission.getAutoScore() != null) {
			return submission.getAutoScore();
		}
		return BigDecimal.ZERO;
	}

	private double scorePercent(Submission submission) {
		BigDecimal score = resolveFinalScore(submission);
		BigDecimal maxScore = submission.getAssignment() != null && submission.getAssignment().getMaxScore() != null
				? submission.getAssignment().getMaxScore()
				: BigDecimal.TEN;
		if (maxScore.compareTo(BigDecimal.ZERO) <= 0) {
			return 0.0;
		}
		return round(score.divide(maxScore, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue());
	}

	private double scoreOn10Scale(Submission submission) {
		BigDecimal score = resolveFinalScore(submission);
		BigDecimal maxScore = submission.getAssignment() != null && submission.getAssignment().getMaxScore() != null
				? submission.getAssignment().getMaxScore()
				: BigDecimal.TEN;
		if (maxScore.compareTo(BigDecimal.ZERO) <= 0) {
			return 0.0;
		}
		double normalizedScore = score.divide(maxScore, 4, RoundingMode.HALF_UP).multiply(BigDecimal.TEN).doubleValue();
		return Math.min(normalizedScore, 10.0);
	}

	private String bucketForScore10(double score10) {
		if (score10 < 5) {
			return "< 5";
		}
		if (score10 < 6) {
			return "5 - 6";
		}
		if (score10 < 7) {
			return "6 - 7";
		}
		if (score10 < 8) {
			return "7 - 8";
		}
		if (score10 < 9) {
			return "8 - 9";
		}
		return "9 - 10";
	}

	private String bucketForScore(double scorePercent) {
		if (scorePercent < 50) {
			return "< 50";
		}
		if (scorePercent < 60) {
			return "50 - 59";
		}
		if (scorePercent < 70) {
			return "60 - 69";
		}
		if (scorePercent < 80) {
			return "70 - 79";
		}
		if (scorePercent < 90) {
			return "80 - 89";
		}
		return "90 - 100";
	}

	private double rate(long numerator, long denominator) {
		if (denominator <= 0) {
			return 0.0;
		}
		return round(numerator * 100.0 / denominator);
	}

	private double round(double value) {
		return Math.round(value * 10.0) / 10.0;
	}

	private record CourseSnapshot(
			Course course,
			List<Enrollment> activeEnrollments,
			List<Lesson> lessons,
			List<Assignment> assignments,
			List<LessonProgress> progresses,
			List<LessonProgress> completedLessonProgress,
			List<Submission> submissions
	) {
	}
}