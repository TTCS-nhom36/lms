package com.ttcs.backend.controller.chat;

import com.ttcs.backend.dto.request.ChatRequest;
import com.ttcs.backend.dto.response.ChatMessageResponse;
import com.ttcs.backend.service.chat.ChatService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/lms/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping
    public ResponseEntity<ChatMessageResponse> sendMessage(@Valid @RequestBody ChatRequest request) {
        return ResponseEntity.ok(chatService.sendMessage(request.getMessage()));
    }

    @GetMapping("/history")
    public ResponseEntity<List<ChatMessageResponse>> getHistory() {
        return ResponseEntity.ok(chatService.getHistory());
    }

    @DeleteMapping("/history")
    public ResponseEntity<Void> clearHistory() {
        chatService.clearHistory();
        return ResponseEntity.noContent().build();
    }
}
