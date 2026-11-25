package com.coworkhub.service;
import com.coworkhub.entity.Member;import com.coworkhub.entity.Room;import java.math.BigDecimal;import java.time.LocalDateTime;
public interface BookingPricingService {BigDecimal calculateRoomCost(Member member,Room room,LocalDateTime start,LocalDateTime end);}
