package com.fixora.model;
import jakarta.persistence.*; import java.time.Instant;
@Entity @Table(name="reviews",uniqueConstraints=@UniqueConstraint(columnNames={"booking_id","customer_id"}))
public class Review {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @ManyToOne(optional=false) @JoinColumn(name="booking_id") public Booking booking;
 @ManyToOne(optional=false) @JoinColumn(name="customer_id") public User customer;
 @Column(nullable=false) public int stars;
 @Column(length=1000) public String comment;
 @Column(nullable=false) public Instant createdAt=Instant.now();
 public Review(){}
}
