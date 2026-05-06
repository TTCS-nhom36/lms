package com.ttcs.backend.exception;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;

import lombok.extern.slf4j.Slf4j;

@RestControllerAdvice
@Slf4j(topic = "Global-Exception")
public class GlobalExceptionHandler {
	// 1. App exception from application/service layer.
	@ExceptionHandler(AppException.class)
	public ResponseEntity<ApiErrorResponse> handleAppException(
			AppException exception, WebRequest request) {

		return ResponseEntity
				.status(exception.getErrorCode().getStatus())
				.body(buildErrorResponse(exception.getErrorCode(), exception.getMessage(), request));
	}

	// 2. Validation errors from request binding.
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiErrorResponse> handleValidationException(
			MethodArgumentNotValidException e, WebRequest request) {

		BindingResult bindingResult = e.getBindingResult();
		List<FieldError> fieldErrors = bindingResult.getFieldErrors();

		// Lấy tất cả error messages
		List<String> errors = fieldErrors.stream()
				.map(FieldError::getDefaultMessage)
				.toList();

		String message = errors.isEmpty()
				? ErrorCode.VALIDATION_ERROR.getMessage()
				: (errors.size() > 1 ? errors.toString() : errors.get(0));
		return ResponseEntity
				.status(ErrorCode.VALIDATION_ERROR.getStatus())
				.body(buildErrorResponse(ErrorCode.VALIDATION_ERROR, message, request, errors));
	}

	// 3. Spring Security authentication errors.
	@ExceptionHandler(AuthenticationException.class)
	public ResponseEntity<ApiErrorResponse> handleAuthenticationException(
			AuthenticationException exception, WebRequest request) {

		log.error("Authentication failed: {}", exception.getMessage());
		return ResponseEntity
				.status(ErrorCode.LOGIN_FAILED.getStatus())
				.body(buildErrorResponse(ErrorCode.LOGIN_FAILED, ErrorCode.LOGIN_FAILED.getMessage(), request));
	}

	// 4. Spring Security authorization errors.
	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<ApiErrorResponse> handleAccessDeniedException(
			AccessDeniedException exception, WebRequest request) {

		log.error("Access denied: {}", exception.getMessage());
		return ResponseEntity
				.status(ErrorCode.ACCESS_DENIED.getStatus())
				.body(buildErrorResponse(ErrorCode.ACCESS_DENIED, ErrorCode.ACCESS_DENIED.getMessage(), request));
	}

	// 5. Missing required request headers.
	@ExceptionHandler(MissingRequestHeaderException.class)
	public ResponseEntity<ApiErrorResponse> handleMissingRequestHeaderException(
			MissingRequestHeaderException exception, WebRequest request) {

		String message = "Required header '" + exception.getHeaderName() + "' is missing";
		return ResponseEntity
				.status(ErrorCode.MISSING_REQUEST_HEADER.getStatus())
				.body(buildErrorResponse(ErrorCode.MISSING_REQUEST_HEADER, message, request));
	}

	// 6. Database constraint violations.
	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<ApiErrorResponse> handleDataIntegrityViolation(
			DataIntegrityViolationException exception, WebRequest request) {
		String detailedMessage = exception.getMostSpecificCause() != null
				? exception.getMostSpecificCause().getMessage()
				: ErrorCode.DATA_INTEGRITY_VIOLATION.getMessage();
		return ResponseEntity
				.status(ErrorCode.DATA_INTEGRITY_VIOLATION.getStatus())
				.body(buildErrorResponse(ErrorCode.DATA_INTEGRITY_VIOLATION, detailedMessage, request));
	}

	// 7. Preserve status information for framework-level status exceptions.
	@ExceptionHandler(ResponseStatusException.class)
	public ResponseEntity<ApiErrorResponse> handleResponseStatusException(
			ResponseStatusException exception, WebRequest request) {

		ErrorCode mappedErrorCode = switch (exception.getStatusCode().value()) {
			case 400 -> ErrorCode.BAD_REQUEST;
			case 401 -> ErrorCode.UNAUTHORIZED;
			case 403 -> ErrorCode.ACCESS_DENIED;
			case 404 -> ErrorCode.NOT_FOUND;
			case 429 -> ErrorCode.TOO_MANY_REQUESTS;
			default -> ErrorCode.INTERNAL_SERVER_ERROR;
		};
		String message = exception.getReason() != null ? exception.getReason() : mappedErrorCode.getMessage();
		return ResponseEntity
				.status(exception.getStatusCode())
				.body(buildErrorResponse(mappedErrorCode, message, request));
	}

	// 8. Catch-all for unhandled exceptions.
	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiErrorResponse> handleAllExceptions(
			Exception ex, WebRequest request) {

		log.error("Unexpected exception occurred: ", ex);
		return ResponseEntity
				.status(ErrorCode.INTERNAL_SERVER_ERROR.getStatus())
				.body(buildErrorResponse(
						ErrorCode.INTERNAL_SERVER_ERROR,
						ErrorCode.INTERNAL_SERVER_ERROR.getMessage(),
						request));
	}

	private ApiErrorResponse buildErrorResponse(ErrorCode errorCode, String message, WebRequest request) {
		return buildErrorResponse(errorCode, message, request, null);
	}

	private ApiErrorResponse buildErrorResponse(
			ErrorCode errorCode,
			String message,
			WebRequest request,
			List<String> details) {
		return new ApiErrorResponse(
				LocalDateTime.now(),
				errorCode.getStatus().value(),
				errorCode.getStatus().getReasonPhrase(),
				message,
				request.getDescription(false).replace("uri=", ""),
				details
		);
	}
}
