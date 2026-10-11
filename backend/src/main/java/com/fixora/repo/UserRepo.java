package com.fixora.repo;
import com.fixora.model.User; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface UserRepo extends JpaRepository<User,Long> { Optional<User> findByEmailIgnoreCase(String email); boolean existsByEmailIgnoreCase(String email); List<User> findByRoleAndEnabledTrue(String role); }
