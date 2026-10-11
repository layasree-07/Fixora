package com.fixora.repo;
import com.fixora.model.Booking; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface BookingRepo extends JpaRepository<Booking,Long> { List<Booking> findByCustomerIdOrderByCreatedAtDesc(Long id); List<Booking> findByServicerIdOrderByCreatedAtDesc(Long id); List<Booking> findAllByOrderByCreatedAtDesc(); Optional<Booking> findByPublicId(String publicId); }
