package com.ttcs.backend.controller;

import com.ttcs.backend.dto.request.ChangePasswordRequest;
import com.ttcs.backend.dto.request.UpdateMyProfileRequest;
import com.ttcs.backend.dto.request.UpdateUserRoleRequest;
import com.ttcs.backend.dto.request.UserRequest;
import com.ttcs.backend.dto.response.PageResponse;
import com.ttcs.backend.dto.response.UserResponse;
import com.ttcs.backend.enums.UserRole;
import com.ttcs.backend.service.UserService;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/lms/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<UserResponse>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(userService.findPage(search, role, active, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(@RequestBody UserRequest request) {
        return ResponseEntity.ok(userService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> update(@PathVariable UUID id, @RequestBody UserRequest request) {
        return ResponseEntity.ok(userService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        userService.disable(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<UserResponse> updateRole(@PathVariable UUID id, @RequestBody UpdateUserRoleRequest request) {
        return ResponseEntity.ok(userService.updateRole(id, request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMyProfile(@RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(userService.findById(userId));
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateMyProfile(@RequestHeader("X-User-Id") UUID userId, @RequestBody UpdateMyProfileRequest request) {
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    @PatchMapping("/me/password")
    public ResponseEntity<Void> changeMyPassword(@RequestHeader("X-User-Id") UUID userId, @RequestBody ChangePasswordRequest request) {
        userService.changePassword(userId, request);
        return ResponseEntity.noContent().build();
    }
}
