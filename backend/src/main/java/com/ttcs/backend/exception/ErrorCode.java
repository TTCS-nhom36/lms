package com.ttcs.backend.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

	BAD_REQUEST(400, HttpStatus.BAD_REQUEST, "Bad request"),
	VALIDATION_ERROR(400, HttpStatus.BAD_REQUEST, "Validation failed"),
	NOT_FOUND(404, HttpStatus.NOT_FOUND, "Resource not found"),
	INTERNAL_SERVER_ERROR(500, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error"),
	INTERNAL_ERROR(500, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error"),
	UNAUTHORIZED(401, HttpStatus.UNAUTHORIZED, "Unauthorized access"),
	LOGIN_FAILED(401, HttpStatus.UNAUTHORIZED, "Email or password incorrect"),
	TOKEN_INVALID(401, HttpStatus.UNAUTHORIZED, "Invalid token"),
	TOKEN_SIGNING_FAILED(500, HttpStatus.INTERNAL_SERVER_ERROR, "Token signing failed"),
	USER_NOT_FOUND(404, HttpStatus.NOT_FOUND, "User not found"),
	PASSWORD_INCORRECT(400, HttpStatus.BAD_REQUEST, "Incorrect password"),
	OTP_INVALID(400, HttpStatus.BAD_REQUEST, "Invalid OTP"),
	MISSING_REQUEST_HEADER(400, HttpStatus.BAD_REQUEST, "Missing required request header"),
	DATA_INTEGRITY_VIOLATION(400, HttpStatus.BAD_REQUEST, "Data integrity violation"),
	TOO_MANY_REQUESTS(429, HttpStatus.TOO_MANY_REQUESTS, "Too many requests"),
	ACCESS_DENIED(403, HttpStatus.FORBIDDEN, "Access denied");

	private final int code;
	private final HttpStatus status;
	private final String message;

	ErrorCode(int code, HttpStatus status, String message) {
		this.code = code;
		this.status = status;
		this.message = message;
	}

	public int getCode() {
		return code;
	}

	public HttpStatus getStatus() {
		return status;
	}

	public String getMessage() {
		return message;
	}
}
