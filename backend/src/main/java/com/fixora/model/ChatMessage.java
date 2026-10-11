package com.fixora.model;
import jakarta.persistence.*; import java.time.Instant;
@Entity @Table(name="chat_messages")
public class ChatMessage {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @ManyToOne(optional=false) @JoinColumn(name="booking_id") public Booking booking;
 @ManyToOne(optional=false) @JoinColumn(name="sender_id") public User sender;
 @Column(nullable=false,length=2000) public String body;
 @Column(nullable=false) public Instant sentAt=Instant.now();
 public ChatMessage(){}
}
