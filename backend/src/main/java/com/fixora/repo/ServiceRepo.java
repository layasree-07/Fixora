package com.fixora.repo;
import com.fixora.model.ServiceItem; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface ServiceRepo extends JpaRepository<ServiceItem,Long> { Optional<ServiceItem> findByCodeAndActiveTrue(String code); List<ServiceItem> findByActiveTrue(); }
