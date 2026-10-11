package com.fixora.repo;
import com.fixora.model.Review; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface ReviewRepo extends JpaRepository<Review,Long> { boolean existsByBookingIdAndCustomerId(Long bookingId, Long customerId); List<Review> findAllByOrderByCreatedAtDesc(); }
