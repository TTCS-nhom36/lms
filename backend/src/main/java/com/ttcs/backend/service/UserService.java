package com.ttcs.backend.service;

import com.ttcs.backend.dto.request.ChangePasswordRequest;
import com.ttcs.backend.dto.request.UpdateMyProfileRequest;
import com.ttcs.backend.dto.request.UpdateUserRoleRequest;
import com.ttcs.backend.dto.request.UserRequest;
import com.ttcs.backend.dto.response.PageResponse;
import com.ttcs.backend.dto.response.UserResponse;
import com.ttcs.backend.entity.User;
import com.ttcs.backend.enums.UserRole;
import com.ttcs.backend.exception.AppException;
import com.ttcs.backend.exception.ErrorCode;
import com.ttcs.backend.mapper.UserMapper;
import com.ttcs.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, UserMapper userMapper, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return userRepository.findAll().stream().map(userMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> findPage(String search, UserRole role, Boolean active, int page, int size) {
        List<UserResponse> filteredUsers = userRepository.findAll().stream()
                .filter(user -> matchesSearch(user, search))
                .filter(user -> role == null || user.getRole() == role)
                .filter(user -> active == null || active.equals(user.getIsActive()))
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(userMapper::toResponse)
                .toList();
        return paginate(filteredUsers, page, size);
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

    public void changePassword(UUID id, ChangePasswordRequest request) {
        if (request == null || request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST, "newPassword is required");
        }
        User user = findUserEntityById(id);
        user.setPasswordHash(request.getNewPassword());
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

    private PageResponse<UserResponse> paginate(List<UserResponse> items, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        int fromIndex = Math.min(safePage * safeSize, items.size());
        int toIndex = Math.min(fromIndex + safeSize, items.size());
        int totalPages = safeSize == 0 ? 0 : (int) Math.ceil((double) items.size() / safeSize);
        return new PageResponse<>(items.subList(fromIndex, toIndex), safePage, safeSize, items.size(), totalPages);
    }

    private User findUserEntityById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.NOT_FOUND, "User not found: " + id));
    }
}
