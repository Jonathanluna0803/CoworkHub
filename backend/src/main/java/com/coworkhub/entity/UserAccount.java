package com.coworkhub.entity;
import jakarta.persistence.*;
@Entity @Table(name="user_accounts",uniqueConstraints=@UniqueConstraint(columnNames="username")) public class UserAccount { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @Column(nullable=false,unique=true) public String username; @Column(nullable=false) public String password; @Enumerated(EnumType.STRING) @Column(nullable=false) public Enums.Role role; @com.fasterxml.jackson.annotation.JsonIgnore @OneToOne @JoinColumn(name="member_id",unique=true) public Member member; public UserAccount(){} }
