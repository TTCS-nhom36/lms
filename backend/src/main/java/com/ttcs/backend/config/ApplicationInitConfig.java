package com.ttcs.backend.config;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.ttcs.backend.entity.User;
import com.ttcs.backend.enums.UserRole;
import com.ttcs.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class ApplicationInitConfig {

    private final PasswordEncoder passwordEncoder;
    @Bean
    public ApplicationRunner applicationRunner(UserRepository userRepository) {
        return args -> {
            if (userRepository.findByEmail("admin@example.com").isEmpty()) {
                User user = User.builder()
                    .email("admin@example.com")
                    .passwordHash(passwordEncoder.encode("admin@123"))
                    .fullName("System Administrator")
                    .role(UserRole.ADMIN)
                    .build();

                userRepository.save(user);
                log.warn("Admin user has been created with default password \"admin@123\". Please change it immediately.");
            }
        };
    }
}
