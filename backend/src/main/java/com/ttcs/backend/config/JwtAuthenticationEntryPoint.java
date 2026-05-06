package com.ttcs.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.ttcs.backend.exception.ApiErrorResponse;
import com.ttcs.backend.exception.ErrorCode;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.TimeZone;
import java.time.LocalDateTime;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = buildObjectMapper();

    private static ObjectMapper buildObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.setTimeZone(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        return mapper;
    }

    @Override
    public void commence(HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException) throws IOException, ServletException {
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;

        response.setStatus(errorCode.getStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        ApiErrorResponse errorResponse = ApiErrorResponse.builder()
                .status(errorCode.getCode())
                .error(errorCode.getStatus().getReasonPhrase())
                .message(errorCode.getMessage())
                .timestamp(LocalDateTime.now())
                .path(request.getRequestURI())
                .build();

        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
        response.flushBuffer();
    }

    private String resolveOriginalPath(HttpServletRequest request) {
        Object errorUri = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
        if (errorUri != null) {
            return errorUri.toString();
        }

        Object forwardUri = request.getAttribute(RequestDispatcher.FORWARD_REQUEST_URI);
        if (forwardUri != null) {
            return forwardUri.toString();
        }

        Object includeUri = request.getAttribute(RequestDispatcher.INCLUDE_REQUEST_URI);
        if (includeUri != null) {
            return includeUri.toString();
        }

        return request.getRequestURI();
    }
}
