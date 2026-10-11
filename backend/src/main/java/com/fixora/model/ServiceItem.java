package com.fixora.model;
import jakarta.persistence.*;
@Entity @Table(name="service_items")
public class ServiceItem {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Column(nullable=false,unique=true) public String code;
 @Column(nullable=false) public String name;
 @Column(nullable=false,length=1000) public String description;
 @Column(nullable=false) public int pricePaise;
 @Column(nullable=false) public boolean active=true;
 public ServiceItem(){}
}
