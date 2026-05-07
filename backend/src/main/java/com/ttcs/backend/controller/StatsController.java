package com.ttcs.backend.controller;

import com.ttcs.backend.dto.response.stats.AdminSummaryResponse;
import com.ttcs.backend.dto.response.stats.AssignmentSubmissionStatResponse;
import com.ttcs.backend.dto.response.stats.CourseOverviewResponse;
import com.ttcs.backend.dto.response.stats.LessonCompletionStatResponse;
import com.ttcs.backend.dto.response.stats.ScoreDistributionBucketResponse;
import com.ttcs.backend.dto.response.stats.StudentAttendanceResponse;
import com.ttcs.backend.dto.response.stats.StudentProgressResponse;
import com.ttcs.backend.dto.response.stats.StudentScoresResponse;
import com.ttcs.backend.service.StatsService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/lms/stats")
public class StatsController {

	private final StatsService statsService;

	public StatsController(StatsService statsService) {
		this.statsService = statsService;
	}

	@GetMapping("/courses/{id}/overview")
	@PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
	public ResponseEntity<CourseOverviewResponse> getCourseOverview(@PathVariable Long id) {
		return ResponseEntity.ok(statsService.getCourseOverview(id));
	}

	@GetMapping("/courses/{id}/completion")
	@PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
	public ResponseEntity<List<LessonCompletionStatResponse>> getCourseCompletion(@PathVariable Long id) {
		return ResponseEntity.ok(statsService.getLessonCompletionStats(id));
	}

	@GetMapping("/courses/{id}/submission-rate")
	@PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
	public ResponseEntity<List<AssignmentSubmissionStatResponse>> getSubmissionRate(@PathVariable Long id) {
		return ResponseEntity.ok(statsService.getSubmissionRateStats(id));
	}

	@GetMapping("/courses/{id}/score-distribution")
	@PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
	public ResponseEntity<List<ScoreDistributionBucketResponse>> getScoreDistribution(@PathVariable Long id) {
		return ResponseEntity.ok(statsService.getScoreDistributionStats(id));
	}

	@GetMapping("/courses/{id}/attendance")
	@PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
	public ResponseEntity<List<StudentAttendanceResponse>> getAttendance(@PathVariable Long id) {
		return ResponseEntity.ok(statsService.getAttendanceStats(id));
	}

	@GetMapping("/students/{id}/progress")
	@PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
	public ResponseEntity<StudentProgressResponse> getStudentProgress(@PathVariable UUID id) {
		return ResponseEntity.ok(statsService.getStudentProgress(id));
	}

	@GetMapping("/students/{id}/scores")
	@PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR', 'STUDENT')")
	public ResponseEntity<StudentScoresResponse> getStudentScores(@PathVariable UUID id) {
		return ResponseEntity.ok(statsService.getStudentScores(id));
	}

	@GetMapping("/admin/summary")
	@PreAuthorize("hasRole('ADMIN')")
	public ResponseEntity<AdminSummaryResponse> getAdminSummary() {
		return ResponseEntity.ok(statsService.getAdminSummary());
	}
}