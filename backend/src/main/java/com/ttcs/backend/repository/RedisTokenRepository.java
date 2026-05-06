package com.ttcs.backend.repository;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;
import com.ttcs.backend.entity.RedisToken;

@Repository
public interface RedisTokenRepository extends CrudRepository<RedisToken, String> {

}
