package com.ttcs.backend.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

	@ExceptionHandler(AppException.class)
	public ResponseEntity<ApiErrorResponse> handleAppException(AppException exception, HttpServletRequest request) {
		ErrorCode errorCode = exception.getErrorCode();
		return buildResponse(errorCode.getStatus(), exception.getMessage(), request.getRequestURI());
	}

	@ExceptionHandler(ResponseStatusException.class)
	public ResponseEntity<ApiErrorResponse> handleResponseStatusException(ResponseStatusException exception, HttpServletRequest request) {
		HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
		String message = exception.getReason() != null ? exception.getReason() : status.getReasonPhrase();
		return buildResponse(status, message, request.getRequestURI());
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiErrorResponse> handleValidationException(MethodArgumentNotValidException exception, HttpServletRequest request) {
		List<String> errors = exception.getBindingResult().getFieldErrors().stream()
				.map(this::formatFieldError)
				.toList();
		return buildResponse(HttpStatus.BAD_REQUEST, "Validation failed", request.getRequestURI(), errors);
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ApiErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException exception, HttpServletRequest request) {
		String message = formatTypeMismatchMessage(exception);
		return buildResponse(HttpStatus.BAD_REQUEST, message, request.getRequestURI());
	}

	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<ApiErrorResponse> handleIllegalArgument(IllegalArgumentException exception, HttpServletRequest request) {
		return buildResponse(HttpStatus.BAD_REQUEST, exception.getMessage(), request.getRequestURI());
	}

	@ExceptionHandler(RuntimeException.class)
	public ResponseEntity<ApiErrorResponse> handleRuntimeException(RuntimeException exception, HttpServletRequest request) {
		return buildResponse(HttpStatus.BAD_REQUEST, exception.getMessage(), request.getRequestURI());
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiErrorResponse> handleGenericException(Exception exception, HttpServletRequest request) {
		return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR.getDefaultMessage(), request.getRequestURI());
	}

	private ResponseEntity<ApiErrorResponse> buildResponse(HttpStatus status, String message, String path) {
		return buildResponse(status, message, path, null);
	}

	private ResponseEntity<ApiErrorResponse> buildResponse(HttpStatus status, String message, String path, List<String> details) {
		ApiErrorResponse body = new ApiErrorResponse(
				LocalDateTime.now(),
				status.value(),
				status.getReasonPhrase(),
				message,
				path,
				details
		);
		return ResponseEntity.status(status).body(body);
	}

	private String formatFieldError(FieldError fieldError) {
		return fieldError.getField() + ": " + fieldError.getDefaultMessage();
	}

	private String formatTypeMismatchMessage(MethodArgumentTypeMismatchException exception) {
		String paramName = exception.getName();
		Object providedValue = exception.getValue();
		Class<?> requiredType = exception.getRequiredType();

		String expectedType = requiredType != null ? requiredType.getSimpleName() : "required type";
		String valueText = providedValue != null ? String.valueOf(providedValue) : "null";

		if (isUnresolvedTemplateVariable(valueText)) {
			return "Invalid value for parameter '" + paramName + "': unresolved template variable "
					+ "'" + valueText + "'. Set this variable in your API client before sending the request.";
		}

		return "Invalid value for parameter '" + paramName + "': expected " + expectedType
				+ ", but received '" + valueText + "'.";
	}

	private boolean isUnresolvedTemplateVariable(String value) {
		String normalized = value == null ? "" : value.trim();
		return normalized.matches("^\\{\\{\\s*[A-Za-z0-9_.-]+\\s*\\}\\}$");
	}
}
