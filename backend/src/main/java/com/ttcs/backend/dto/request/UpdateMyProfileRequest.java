package com.ttcs.backend.dto.request;

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
public class UpdateMyProfileRequest {

	@Size(max = 255, message = "fullName must not exceed 255 characters")
	private String fullName;

	@Size(max = 20, message = "phone must not exceed 20 characters")
	private String phone;

	private String avatarUrl;
}
