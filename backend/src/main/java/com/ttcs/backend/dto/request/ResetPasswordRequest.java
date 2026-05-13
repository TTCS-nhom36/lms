package com.ttcs.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetPasswordRequest {
    @NotBlank(message = "email is required")
    @Email(message = "email must be valid")
    private String email;

    @NotBlank(message = "otp is required")
    private String otp;

    @NotBlank(message = "newPassword is required")
    @Size(min = 6, max = 255, message = "newPassword must be between 6 and 255 characters")
    private String newPassword;
}
