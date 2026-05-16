package com.ttcs.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class S3Service {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket}")
    private String bucketName;

    /**
     * Upload a file to S3
     * 
     * @param file   the file to upload
     * @param folder the folder/prefix in the bucket (e.g., "courses",
     *               "assignments")
     * @return the S3 key of the uploaded file
     */
    public String uploadFile(MultipartFile file, String folder) {
        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        String key = folder + "/" + fileName;

        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            log.info("File uploaded successfully to S3: {}", key);
            return key;
        } catch (IOException e) {
            log.error("Failed to upload file to S3: {}", e.getMessage());
            throw new RuntimeException("Failed to upload file to S3", e);
        }
    }

    /**
     * Get a presigned URL for downloading a file (valid for 1 hour)
     * 
     * @param key the S3 key of the file
     * @return presigned URL string
     */
    public String getPresignedUrl(String key) {
        String objectKey = normalizeObjectKey(key);
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(1))
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
        return presignedRequest.url().toString();
    }

    /**
     * Get the public URL of a file
     * 
     * @param key the S3 key of the file
     * @return public URL string
     */
    public String getFileUrl(String key) {
        return String.format("https://%s.s3.ap-southeast-1.amazonaws.com/%s", bucketName, encodeObjectKey(key));
    }

    public String getObjectKey(String keyOrUrl) {
        return normalizeObjectKey(keyOrUrl);
    }

    /**
     * Download file bytes from S3
     * 
     * @param key the S3 key of the file
     * @return the file content as byte array
     */
    public byte[] getFileBytes(String key) {
        try {
            String objectKey = normalizeObjectKey(key);
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(objectKey)
                    .build();

            ResponseInputStream<GetObjectResponse> response = s3Client.getObject(getObjectRequest);
            return response.readAllBytes();
        } catch (IOException e) {
            log.error("Failed to download file from S3: {}", e.getMessage());
            throw new RuntimeException("Failed to download file from S3", e);
        }
    }

    /**
     * Get the content type of a file in S3
     * 
     * @param key the S3 key of the file
     * @return the content type string
     */
    public String getFileContentType(String key) {
        String objectKey = normalizeObjectKey(key);
        HeadObjectRequest headRequest = HeadObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .build();
        HeadObjectResponse headResponse = s3Client.headObject(headRequest);
        return headResponse.contentType();
    }

    /**
     * Delete a file from S3
     * 
     * @param key the S3 key of the file to delete
     */
    public void deleteFile(String key) {
        try {
            String objectKey = normalizeObjectKey(key);
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(objectKey)
                    .build();

            s3Client.deleteObject(deleteObjectRequest);
            log.info("File deleted successfully from S3: {}", key);
        } catch (S3Exception e) {
            log.error("Failed to delete file from S3: {}", e.getMessage());
            throw new RuntimeException("Failed to delete file from S3", e);
        }
    }

    private String normalizeObjectKey(String keyOrUrl) {
        if (keyOrUrl == null || keyOrUrl.isBlank()) {
            return keyOrUrl;
        }
        String value = keyOrUrl.trim();
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
            return value;
        }
        try {
            URI uri = URI.create(value);
            String path = uri.getRawPath();
            if (path == null || path.isBlank()) {
                return value;
            }
            String key = path.startsWith("/") ? path.substring(1) : path;
            return URLDecoder.decode(key, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            log.warn("Could not parse S3 object URL, using raw value: {}", keyOrUrl);
            return value;
        }
    }

    private String encodeObjectKey(String key) {
        return Arrays.stream(key.split("/", -1))
                .map(part -> URLEncoder.encode(part, StandardCharsets.UTF_8).replace("+", "%20"))
                .reduce((left, right) -> left + "/" + right)
                .orElse(key);
    }
}
