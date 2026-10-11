package com.fixora.repo;
import com.fixora.model.ChatMessage; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface ChatRepo extends JpaRepository<ChatMessage,Long> { List<ChatMessage> findByBookingPublicIdOrderBySentAtAsc(String publicId); }
