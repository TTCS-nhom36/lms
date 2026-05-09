package com.ttcs.backend.listener;

import com.ttcs.backend.event.RagDeleteEvent;
import com.ttcs.backend.event.RagSyncEvent;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PostRemove;
import jakarta.persistence.PostUpdate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class RagEntityListener {

    private static ApplicationEventPublisher publisher;

    public static void setPublisher(ApplicationEventPublisher eventPublisher) {
        publisher = eventPublisher;
    }

    @PostPersist
    @PostUpdate
    public void onSave(Object entity) {
        if (publisher != null) {
            Long id = getEntityId(entity);
            if (id != null) {
                log.debug("Publishing RagSyncEvent for {} with id {}", entity.getClass().getSimpleName(), id);
                publisher.publishEvent(new RagSyncEvent(entity.getClass(), id));
            }
        }
    }

    @PostRemove
    public void onDelete(Object entity) {
        if (publisher != null) {
            Long id = getEntityId(entity);
            if (id != null) {
                log.debug("Publishing RagDeleteEvent for {} with id {}", entity.getClass().getSimpleName(), id);
                publisher.publishEvent(new RagDeleteEvent(entity.getClass(), id));
            }
        }
    }

    private Long getEntityId(Object entity) {
        try {
            return (Long) entity.getClass().getMethod("getId").invoke(entity);
        } catch (Exception e) {
            log.warn("Failed to get ID from entity {}", entity.getClass().getSimpleName(), e);
            return null;
        }
    }
}
