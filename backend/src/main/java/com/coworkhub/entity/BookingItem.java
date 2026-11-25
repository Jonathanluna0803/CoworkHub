package com.coworkhub.entity;
import jakarta.persistence.*;import java.math.BigDecimal;
@Entity @Table(name="booking_items") public class BookingItem { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; public int quantity; @Column(precision=10,scale=2) public BigDecimal appliedUnitPrice; @com.fasterxml.jackson.annotation.JsonIgnore @ManyToOne(fetch=FetchType.LAZY) public Booking booking; @ManyToOne(fetch=FetchType.LAZY) public AdditionalService service; public BookingItem(){} }
