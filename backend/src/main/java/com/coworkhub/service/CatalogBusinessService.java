package com.coworkhub.service;
import com.coworkhub.entity.*;import java.util.List;
public interface CatalogBusinessService {List<Location> locations();List<Room> rooms();List<Equipment> equipment();List<MembershipPlan> plans();List<AdditionalService> additionalServices();}
