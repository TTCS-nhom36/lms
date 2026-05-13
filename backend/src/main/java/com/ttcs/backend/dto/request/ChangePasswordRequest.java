package com.ttcs.backend.dto.request;

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
public class ChangePasswordRequest {

	@NotBlank(message = "newPassword is required")
	@Size(min = 6, max = 255, message = "newPassword must be between 6 and 255 characters")
	private String newPassword;
}
