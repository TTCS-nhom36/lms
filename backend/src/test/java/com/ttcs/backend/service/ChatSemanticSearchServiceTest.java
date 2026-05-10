package com.ttcs.backend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ttcs.backend.entity.Course;
import com.ttcs.backend.entity.Enrollment;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.enums.UserRole;
import com.ttcs.backend.repository.CourseRepository;
import com.ttcs.backend.repository.EnrollmentRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ChatSemanticSearchServiceTest {

    private final RagService ragService = mock(RagService.class);
    private final CourseRepository courseRepository = mock(CourseRepository.class);
    private final EnrollmentRepository enrollmentRepository = mock(EnrollmentRepository.class);
    private final ChatSemanticSearchService service =
            new ChatSemanticSearchService(ragService, courseRepository, enrollmentRepository);

    @Test
    void adminSearchesWithoutFilter() {
        User admin = User.builder()
                .id(UUID.randomUUID())
                .role(UserRole.ADMIN)
                .build();

        assertNull(service.buildVisibilityFilter(admin));
    }

    @Test
    void instructorFilterIsLimitedToOwnedCoursesAndOwnUploads() {
        User instructor = User.builder()
                .id(UUID.randomUUID())
                .role(UserRole.INSTRUCTOR)
                .build();
        Course ownedCourse = Course.builder()
                .id(12L)
                .createdBy(instructor)
                .build();
        Course otherCourse = Course.builder()
                .id(99L)
                .createdBy(User.builder().id(UUID.randomUUID()).build())
                .build();
        when(courseRepository.findAll()).thenReturn(List.of(ownedCourse, otherCourse));

        String filter = service.buildVisibilityFilter(instructor);

        assertTrue(filter.contains("courseId == '12'"));
        assertTrue(filter.contains("uploadedByUserId == '" + instructor.getId() + "'"));
        assertTrue(!filter.contains("courseId == '99'"));
    }

    @Test
    void studentFilterIsLimitedToEnrolledCoursesAndOwnUserData() {
        User student = User.builder()
                .id(UUID.randomUUID())
                .role(UserRole.STUDENT)
                .build();
        Course enrolledCourse = Course.builder().id(7L).build();
        Enrollment enrollment = Enrollment.builder()
                .user(student)
                .course(enrolledCourse)
                .build();
        when(enrollmentRepository.findAll()).thenReturn(List.of(enrollment));

        String filter = service.buildVisibilityFilter(student);

        assertTrue(filter.contains("courseId == '7'"));
        assertTrue(filter.contains("userId == '" + student.getId() + "'"));
        assertTrue(filter.contains("uploadedByUserId == '" + student.getId() + "'"));
    }

    @Test
    void studentWithNoEnrollmentsOnlySeesOwnPrivateDataAndUploads() {
        User student = User.builder()
                .id(UUID.randomUUID())
                .role(UserRole.STUDENT)
                .build();
        when(enrollmentRepository.findAll()).thenReturn(List.of());

        String filter = service.buildVisibilityFilter(student);

        assertTrue(filter.contains("visibility == '__none__'"));
        assertTrue(filter.contains("userId == '" + student.getId() + "'"));
        assertTrue(filter.contains("uploadedByUserId == '" + student.getId() + "'"));
    }
}
