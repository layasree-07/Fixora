package com.fixora.model;
import jakarta.persistence.*; import java.time.Instant; import java.time.LocalDateTime;
@Entity @Table(name="bookings", indexes={@Index(name="idx_booking_customer",columnList="customer_id"),@Index(name="idx_booking_servicer",columnList="servicer_id"),@Index(name="idx_booking_status",columnList="status")})
public class Booking {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Column(nullable=false,unique=true) public String publicId;
 @ManyToOne(optional=false,fetch=FetchType.EAGER) @JoinColumn(name="customer_id") public User customer;
 @ManyToOne(fetch=FetchType.EAGER) @JoinColumn(name="servicer_id") public User servicer;
 @ManyToOne(fetch=FetchType.EAGER) @JoinColumn(name="service_item_id") public ServiceItem serviceItem;
 @Column(nullable=false) public String description;
 @Column(nullable=false) public String address;
 @Column(nullable=false) public String city;
 @Column(nullable=false) public LocalDateTime scheduledAt;
 @Column(nullable=false) public int agreedPricePaise;
 @Column(nullable=false) public String status="PENDING_ASSIGNMENT";
 @Column(nullable=false) public boolean customRequest=false;
 public String quoteNote;
 public String otpHash;
 public Instant otpExpiresAt;
 public Instant createdAt=Instant.now();
 @Version public long version;
 public Booking(){}
}
