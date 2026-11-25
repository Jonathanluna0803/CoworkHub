package com.coworkhub.repository;
import com.coworkhub.entity.Booking;import com.coworkhub.entity.Enums.BookingStatus;import org.springframework.data.jpa.repository.JpaRepository;import org.springframework.data.jpa.repository.EntityGraph;import java.time.LocalDateTime;import java.util.*;
public interface BookingRepository extends JpaRepository<Booking,Long>{
 List<Booking> findByRoomIdAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(Long roomId,Collection<BookingStatus> statuses,LocalDateTime end,LocalDateTime start);
 @EntityGraph(attributePaths={"room","member","items","items.service"}) List<Booking> findByMemberId(Long memberId);
 @EntityGraph(attributePaths={"room","member","items","items.service"}) List<Booking> findByRoomId(Long roomId);
 @EntityGraph(attributePaths={"room","member","items","items.service"}) List<Booking> findByStatus(BookingStatus status);
 @EntityGraph(attributePaths={"room","member","items","items.service"}) List<Booking> findByMemberIdAndStartTimeBetween(Long memberId,LocalDateTime from,LocalDateTime to);
 long countByMemberIdAndStatusInAndEndTimeAfter(Long memberId,Collection<BookingStatus> statuses,LocalDateTime now);
 @EntityGraph(attributePaths={"room","member","items","items.service"}) List<Booking> findAllWithDetails();
}
