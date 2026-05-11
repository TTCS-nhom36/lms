package com.ttcs.backend.service;

import com.ttcs.backend.entity.Course;
import com.ttcs.backend.entity.Enrollment;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.enums.UserRole;
import com.ttcs.backend.repository.CourseRepository;
import com.ttcs.backend.repository.EnrollmentRepository;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatSemanticSearchService {

    private final RagService ragService;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Transactional(readOnly = true)
    public String search(User user, String question) {
        try {
            String filter = buildVisibilityFilter(user);
            List<Document> results = ragService.search(question, 10, filter);
            List<Document> filtered = filterResultsForUser(user, results);
            log.info("Qdrant semantic search successful. Found {} documents after filtering.", filtered.size());
            return ragService.buildContextFromResults(filtered);
        } catch (Exception e) {
            log.warn("Qdrant semantic search failed: {}", e.getMessage());
            return "Khong the tim kiem semantic trong Qdrant tai thoi diem nay.";
        }
    }

    String buildVisibilityFilter(User user) {
        if (user.getRole() == UserRole.ADMIN) {
            return null;
        }

        if (user.getRole() == UserRole.INSTRUCTOR) {
            List<String> courseIds = courseRepository.findAll().stream()
                    .filter(course -> course.getCreatedBy().getId().equals(user.getId()))
                    .map(Course::getId)
                    .map(String::valueOf)
                    .toList();
            return joinOr(List.of(
                    and(eq("visibility", "COURSE"), inCourseIds(courseIds)),
                    and(eq("visibility", "INSTRUCTOR"), inCourseIds(courseIds)),
                    and(eq("visibility", "USER"), inCourseIds(courseIds)),
                    eq("uploadedByUserId", user.getId().toString())));
        }

        List<String> enrolledCourseIds = enrollmentRepository.findAll().stream()
                .filter(enrollment -> enrollment.getUser().getId().equals(user.getId()))
                .map(Enrollment::getCourse)
                .map(Course::getId)
                .map(String::valueOf)
                .toList();

        return joinOr(List.of(
                and(eq("visibility", "COURSE"), inCourseIds(enrolledCourseIds)),
                and(eq("visibility", "USER"), eq("userId", user.getId().toString())),
                eq("uploadedByUserId", user.getId().toString())));
    }

    private String inCourseIds(List<String> courseIds) {
        if (courseIds.isEmpty()) {
            return alwaysFalse();
        }
        return joinOr(courseIds.stream()
                .map(courseId -> eq("courseId", courseId))
                .toList());
    }

    private String eq(String key, String value) {
        return key + " == '" + value.replace("'", "\\'") + "'";
    }

    private String and(String left, String right) {
        return "(" + left + " && " + right + ")";
    }

    private String joinOr(List<String> expressions) {
        List<String> validExpressions = expressions.stream()
                .filter(expression -> expression != null && !expression.isBlank())
                .toList();
        if (validExpressions.isEmpty()) {
            return alwaysFalse();
        }
        return "(" + String.join(" || ", validExpressions) + ")";
    }

    private String alwaysFalse() {
        return "visibility == '__none__'";
    }

    private List<Document> filterResultsForUser(User user, List<Document> results) {
        if (user.getRole() == UserRole.ADMIN) {
            return results;
        }

        String userId = user.getId().toString();
        if (user.getRole() == UserRole.INSTRUCTOR) {
            Set<String> courseIds = courseRepository.findAll().stream()
                    .filter(course -> course.getCreatedBy().getId().equals(user.getId()))
                    .map(Course::getId)
                    .map(String::valueOf)
                    .collect(java.util.stream.Collectors.toSet());
            return results.stream()
                    .filter(doc -> isAllowedForInstructor(doc, userId, courseIds))
                    .toList();
        }

        Set<String> enrolledCourseIds = enrollmentRepository.findAll().stream()
                .filter(enrollment -> enrollment.getUser().getId().equals(user.getId()))
                .map(Enrollment::getCourse)
                .map(Course::getId)
                .map(String::valueOf)
                .collect(java.util.stream.Collectors.toSet());

        return results.stream()
                .filter(doc -> isAllowedForStudent(doc, userId, enrolledCourseIds))
                .toList();
    }

    private boolean isAllowedForInstructor(Document doc, String userId, Set<String> courseIds) {
        String visibility = metadataValue(doc, "visibility");
        String courseId = metadataValue(doc, "courseId");
        String createdBy = metadataValue(doc, "createdBy");
        String uploadedByUserId = metadataValue(doc, "uploadedByUserId");

        if (!uploadedByUserId.isEmpty() && uploadedByUserId.equals(userId)) {
            return true;
        }

        if ("COURSE".equals(visibility)) {
            return (!createdBy.isEmpty() && createdBy.equals(userId))
                    && (!courseId.isEmpty() && courseIds.contains(courseId));
        }

        if ("INSTRUCTOR".equals(visibility)) {
            return (!createdBy.isEmpty() && createdBy.equals(userId))
                    && (!courseId.isEmpty() && courseIds.contains(courseId));
        }

        if ("USER".equals(visibility)) {
            return !courseId.isEmpty() && courseIds.contains(courseId);
        }

        return false;
    }

    private boolean isAllowedForStudent(Document doc, String userId, Set<String> enrolledCourseIds) {
        String visibility = metadataValue(doc, "visibility");
        String courseId = metadataValue(doc, "courseId");
        String docUserId = metadataValue(doc, "userId");
        String ownerUserId = metadataValue(doc, "ownerUserId");
        String uploadedByUserId = metadataValue(doc, "uploadedByUserId");

        if (!uploadedByUserId.isEmpty() && uploadedByUserId.equals(userId)) {
            return true;
        }

        if ("COURSE".equals(visibility)) {
            return !courseId.isEmpty() && enrolledCourseIds.contains(courseId);
        }

        if ("USER".equals(visibility)) {
            return (!ownerUserId.isEmpty() && ownerUserId.equals(userId))
                    || (!docUserId.isEmpty() && docUserId.equals(userId));
        }

        return false;
    }

    private String metadataValue(Document doc, String key) {
        Object value = doc.getMetadata().get(key);
        return value == null ? "" : value.toString();
    }
}
