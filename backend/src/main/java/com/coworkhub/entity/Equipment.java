package com.coworkhub.entity;
import jakarta.persistence.*;
@Entity @Table(name="equipment",uniqueConstraints=@UniqueConstraint(columnNames="name")) public class Equipment { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @Column(nullable=false,unique=true) @jakarta.validation.constraints.NotBlank public String name; public Equipment(){} public Equipment(String name){this.name=name;} }
