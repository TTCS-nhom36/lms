package com.ttcs.backend.listener.chat;

import com.ttcs.backend.event.chat.ChatMessageSavedEvent;
import com.ttcs.backend.service.chat.ChatHistoryCacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class ChatMessageEventListener {

    private final ChatHistoryCacheService chatHistoryCacheService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMessageSaved(ChatMessageSavedEvent event) {
        chatHistoryCacheService.appendMessage(event.userId(), event.message());
    }
}
