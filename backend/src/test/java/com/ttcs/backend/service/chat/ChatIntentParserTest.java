package com.ttcs.backend.service.chat;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.ttcs.backend.service.chat.model.ChatIntentAnalysis;
import org.junit.jupiter.api.Test;

class ChatIntentParserTest {

    private final ChatIntentParser parser = new ChatIntentParser();

    @Test
    void parsesVietnameseQuestionWithAccents() {
        ChatIntentAnalysis intent = parser.parse("Mình còn bài nào chưa làm và hạn nộp là khi nào?");

        assertTrue(intent.has(ChatIntentAnalysis.Type.ASSIGNMENT));
    }

    @Test
    void parsesVietnameseQuestionWithLetterDStroke() {
        ChatIntentAnalysis intent = parser.parse("Điểm quiz của tôi là bao nhiêu?");

        assertTrue(intent.has(ChatIntentAnalysis.Type.GRADE));
        assertTrue(intent.has(ChatIntentAnalysis.Type.ASSIGNMENT));
    }

    @Test
    void parsesVietnameseQuestionWithoutAccents() {
        ChatIntentAnalysis intent = parser.parse("Diem quiz cua toi la bao nhieu?");

        assertTrue(intent.has(ChatIntentAnalysis.Type.GRADE));
        assertTrue(intent.has(ChatIntentAnalysis.Type.ASSIGNMENT));
    }

    @Test
    void fallsBackToGeneralWhenNoIntentMatches() {
        ChatIntentAnalysis intent = parser.parse("Xin chao");

        assertTrue(intent.has(ChatIntentAnalysis.Type.GENERAL));
    }

    @Test
    void detectsListAllRequest() {
        ChatIntentAnalysis intent = parser.parse("Liệt kê tất cả bài tập của tôi");

        assertTrue(intent.has(ChatIntentAnalysis.Type.ASSIGNMENT));
        assertTrue(intent.listAllRequested());
    }
}
