package com.ttcs.backend.dto;

import lombok.*;

import java.util.Date;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JwtInfo {
    private String jwtId;
    private Date issuedTime;
    private Date expiresTime;
}
