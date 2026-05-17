package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.ChangePasswordRequest;
import com.ttcs.backend.dto.request.UpdateMyProfileRequest;
import com.ttcs.backend.dto.request.UpdateUserRoleRequest;
import com.ttcs.backend.dto.request.UserRequest;
import com.ttcs.backend.dto.response.PageResponse;
import com.ttcs.backend.dto.response.UserResponse;
import com.ttcs.backend.entity.Enrollment;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.enums.EnrollmentStatus;
import com.ttcs.backend.enums.UserRole;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.mapper.UserMapper;
import com.ttcs.backend.repository.EnrollmentRepository;
import com.ttcs.backend.repository.UserRepository;
import com.ttcs.backend.utils.PageUtils;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.multipart.MultipartFile;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserService {

    private static final long MAX_AVATAR_SIZE = 5 * 1024 * 1024L; // 5 MB

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final S3Service s3Service;
    private final CurrentUserService currentUserService;
    private final EnrollmentRepository enrollmentRepository;

    public UserService(UserRepository userRepository, UserMapper userMapper, PasswordEncoder passwordEncoder, S3Service s3Service, CurrentUserService currentUserService, EnrollmentRepository enrollmentRepository) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.s3Service = s3Service;
        this.currentUserService = currentUserService;
        this.enrollmentRepository = enrollmentRepository;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return userRepository.findAll().stream().map(userMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> findPage(String search, UserRole role, Boolean active, int page, int size) {
        List<UserResponse> filteredUsers = visibleUsers().stream()
                .filter(user -> matchesSearch(user, search))
                .filter(user -> role == null || user.getRole() == role)
                .filter(user -> active == null || active.equals(user.getIsActive()))
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(userMapper::toResponse)
                .toList();
        return PageUtils.paginate(filteredUsers, page, size);
    }

    @Transactional(readOnly = true)
    public UserResponse findById(UUID id) {
        return userMapper.toResponse(findUserEntityById(id));
    }

    @Transactional(readOnly = true)
    public UserResponse findByEmail(String email) {
        return userMapper.toResponse(userRepository.findByEmail(email)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND)));
    }

    public UserResponse create(UserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Email đã tồn tại");
        }
        User user = userMapper.toEntity(request);
        if (!currentUserService.isAuthenticated()) {
            user.setRole(UserRole.STUDENT);
            user.setIsActive(true);
        } else if (!currentUserService.hasRole("ADMIN")) {
            throw new AccessDeniedException("Only admins can create users while authenticated");
        }
        if (user.getRole() == null) {
            user.setRole(UserRole.STUDENT);
        }
        if (user.getIsActive() == null) {
            user.setIsActive(true);
        }
        user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
        return userMapper.toResponse(userRepository.save(user));
    }

    public UserResponse updateProfile(UUID id, UpdateMyProfileRequest request) {
        User user = findUserEntityById(id);
        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        user.setAvatarUrl(request.getAvatarUrl());
        return userMapper.toResponse(userRepository.save(user));
    }

    /**
     * Upload an avatar image to S3 and update the user's avatarUrl.
     * Validates: image/* content type, max 5 MB.
     */
    public UserResponse uploadAvatar(UUID id, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "No file provided");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Only image files are accepted");
        }
        if (file.getSize() > MAX_AVATAR_SIZE) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Avatar image must not exceed 5 MB");
        }
        String s3Key = s3Service.uploadFile(file, "avatars");
        String publicUrl = s3Service.getFileUrl(s3Key);
        User user = findUserEntityById(id);
        user.setAvatarUrl(publicUrl);
        return userMapper.toResponse(userRepository.save(user));
    }

    public void changePassword(UUID id, ChangePasswordRequest request) {
        if (request == null || request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "newPassword is required");
        }
        User user = findUserEntityById(id);
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public UserResponse updateRole(UUID id, UpdateUserRoleRequest request) {
        if (request == null || request.getRole() == null) {
            throw new AppException(ErrorCode.BAD_REQUEST, "role is required");
        }
        User user = findUserEntityById(id);
        user.setRole(request.getRole());
        return userMapper.toResponse(userRepository.save(user));
    }

    public void disable(UUID id) {
        User user = findUserEntityById(id);
        user.setIsActive(false);
        userRepository.save(user);
    }

    public UserResponse update(UUID id, UserRequest request) {
        User user = findUserEntityById(id);
        if (userRepository.existsByEmail(request.getEmail()) && !user.getEmail().equals(request.getEmail())) {
            throw new AppException(ErrorCode.BAD_REQUEST, "Email đã tồn tại");
        }
        user.setEmail(request.getEmail());
        if (request.getPasswordHash() != null && !request.getPasswordHash().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPasswordHash()));
        }
        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        user.setAvatarUrl(request.getAvatarUrl());
        user.setRole(request.getRole());
        user.setIsActive(request.getIsActive());
        return userMapper.toResponse(userRepository.save(user));
    }

    public void delete(UUID id) {
        userRepository.delete(findUserEntityById(id));
    }

    private boolean matchesSearch(User user, String search) {
        if (search == null || search.isBlank()) {
            return true;
        }
        String normalizedSearch = search.trim().toLowerCase();
        return (user.getEmail() != null && user.getEmail().toLowerCase().contains(normalizedSearch))
                || (user.getFullName() != null && user.getFullName().toLowerCase().contains(normalizedSearch));
    }

    private List<User> visibleUsers() {
        if (!currentUserService.hasRole("INSTRUCTOR") || currentUserService.hasRole("ADMIN")) {
            return userRepository.findAll();
        }
        UUID instructorId = currentUserService.getCurrentUserId();
        return enrollmentRepository.findByCourseCreatedById(instructorId).stream()
                .filter(enrollment -> enrollment.getStatus() == EnrollmentStatus.ACTIVE)
                .map(Enrollment::getUser)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
    }

    private User findUserEntityById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found: " + id));
    }
}
