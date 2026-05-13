package com.ttcs.backend.dto.request;

import com.ttcs.backend.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRequest {

    @NotBlank(message = "email is required")
    @Email(message = "email must be valid")
    private String email;

    @Size(min = 6, max = 255, message = "password must be between 6 and 255 characters")
    private String passwordHash;

    @NotBlank(message = "fullName is required")
    @Size(max = 255, message = "fullName must not exceed 255 characters")
    private String fullName;

    @Size(max = 20, message = "phone must not exceed 20 characters")
    private String phone;

    private String avatarUrl;
    private UserRole role;
    private Boolean isActive;
}
