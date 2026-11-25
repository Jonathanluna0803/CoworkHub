package com.coworkhub.repository;
import com.coworkhub.entity.Member;import com.coworkhub.entity.Enums.MemberStatus;import org.springframework.data.jpa.repository.JpaRepository;import java.util.*;
public interface MemberRepository extends JpaRepository<Member,Long>{boolean existsByDocumentNumber(String documentNumber);boolean existsByEmail(String email);List<Member> findByFullNameContainingIgnoreCase(String name);List<Member> findByStatus(MemberStatus status);}
