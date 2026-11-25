package com.coworkhub.security;
import org.springframework.security.core.Authentication;import org.springframework.stereotype.Component;import io.jsonwebtoken.Claims;
@Component("memberAccess") public class MemberAccess {public boolean isOwner(Authentication authentication,Long memberId){if(authentication==null||authentication.getDetails()==null)return false;Object details=authentication.getDetails();if(!(details instanceof Claims claims))return false;Long tokenId=claims.get("memberId",Long.class);return tokenId!=null&&tokenId.equals(memberId);}}
