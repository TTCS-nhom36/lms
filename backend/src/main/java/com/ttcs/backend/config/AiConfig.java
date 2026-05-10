package com.ttcs.backend.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Slf4j
public class AiConfig {

    @Value("${spring.ai.google.genai.api-key}")
    private String apiKey;

    @Value("${spring.ai.google.genai.embedding.options.model:gemini-embedding-001}")
    private String embeddingModel;

    @Value("${spring.ai.google.genai.embedding.options.dimensions:3072}")
    private int embeddingDimensions;

    private static final String EMBED_URL_PREFIX =
            "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final String EMBED_URL_SUFFIX = ":embedContent?key=";

    @Bean
    public EmbeddingModel embeddingModel() {
        return new GeminiEmbeddingModel(apiKey, embeddingModel, embeddingDimensions);
    }

    /**
     * Custom EmbeddingModel that calls Gemini's embedding API directly.
     * Workaround for Spring AI 2.0.0-M5 requiring project-id for the auto-configured bean.
     */
    static class GeminiEmbeddingModel implements EmbeddingModel {

        private final String apiKey;
        private final String model;
        private final int dimensions;
        private final HttpClient httpClient;
        private final ObjectMapper objectMapper;

        GeminiEmbeddingModel(String apiKey, String model, int dimensions) {
            this.apiKey = apiKey;
            this.model = model;
            this.dimensions = dimensions;
            this.httpClient = HttpClient.newHttpClient();
            this.objectMapper = new ObjectMapper();
        }

        @Override
        public EmbeddingResponse call(EmbeddingRequest request) {
            List<Embedding> embeddings = new ArrayList<>();
            List<String> texts = request.getInstructions();

            for (int i = 0; i < texts.size(); i++) {
                float[] vector = embed(texts.get(i));
                embeddings.add(new Embedding(vector, i));
            }

            return new EmbeddingResponse(embeddings);
        }

        @Override
        public float[] embed(Document document) {
            return embed(document.getText());
        }

        public float[] embed(String text) {
            int maxRetries = 3;
            int retryDelayMs = 2000;

            for (int attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    ObjectNode requestBody = objectMapper.createObjectNode();
                    ObjectNode content = objectMapper.createObjectNode();
                    ArrayNode parts = objectMapper.createArrayNode();
                    ObjectNode part = objectMapper.createObjectNode();
                    part.put("text", text);
                    parts.add(part);
                    content.set("parts", parts);
                    requestBody.set("content", content);
                    requestBody.put("outputDimensionality", dimensions);

                    String jsonBody = objectMapper.writeValueAsString(requestBody);

                    HttpRequest request = HttpRequest.newBuilder()
                            .uri(URI.create(EMBED_URL_PREFIX + model + EMBED_URL_SUFFIX + apiKey))
                            .header("Content-Type", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                            .build();

                    HttpResponse<String> response = httpClient.send(request,
                            HttpResponse.BodyHandlers.ofString());

                    if (response.statusCode() == 429) {
                        log.warn("Gemini Embedding API 429 Too Many Requests (attempt {}/{}). Waiting {}ms...", attempt, maxRetries, retryDelayMs);
                        if (attempt < maxRetries) {
                            Thread.sleep(retryDelayMs);
                            retryDelayMs *= 2; // Exponential backoff
                            continue;
                        } else {
                            log.error("Gemini Embedding API error: {} - {}", response.statusCode(), response.body());
                            return zeroVector(); // Return zero vector on error
                        }
                    } else if (response.statusCode() != 200) {
                        log.error("Gemini Embedding API error: {} - {}", response.statusCode(), response.body());
                        return zeroVector(); // Return zero vector on error
                    }

                    JsonNode responseJson = objectMapper.readTree(response.body());
                    JsonNode values = responseJson.path("embedding").path("values");
                    if (!values.isArray() || values.size() != dimensions) {
                        log.error("Gemini Embedding API returned {} dimensions, expected {}", values.size(), dimensions);
                        return zeroVector();
                    }

                    float[] result = new float[values.size()];
                    for (int i = 0; i < values.size(); i++) {
                        result[i] = (float) values.get(i).asDouble();
                    }
                    return result;

                } catch (Exception e) {
                    log.error("Error calling Gemini Embedding API (attempt {}/{}): {}", attempt, maxRetries, e.getMessage());
                    if (attempt == maxRetries) {
                        return zeroVector();
                    }
                    try {
                        Thread.sleep(retryDelayMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        return zeroVector();
                    }
                }
            }
            return zeroVector();
        }

        private float[] zeroVector() {
            return new float[dimensions];
        }

        @Override
        public int dimensions() {
            return dimensions;
        }
    }
}
