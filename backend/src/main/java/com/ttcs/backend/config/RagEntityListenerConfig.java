package com.ttcs.backend.config;

import com.ttcs.backend.listener.chat.RagEntityListener;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RagEntityListenerConfig {

    public RagEntityListenerConfig(ApplicationEventPublisher publisher) {
        RagEntityListener.setPublisher(publisher);
    }
}
