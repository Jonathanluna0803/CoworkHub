package com.coworkhub.entity;
import jakarta.persistence.*;import java.math.BigDecimal;
@Entity @Table(name="additional_services",uniqueConstraints=@UniqueConstraint(columnNames="name")) public class AdditionalService { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @Column(nullable=false,unique=true) @jakarta.validation.constraints.NotBlank public String name; @Column(precision=10,scale=2,nullable=false) @jakarta.validation.constraints.NotNull @jakarta.validation.constraints.PositiveOrZero public BigDecimal unitPrice; public AdditionalService(){} }
