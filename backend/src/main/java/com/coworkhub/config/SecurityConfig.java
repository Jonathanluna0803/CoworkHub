package com.coworkhub.config;

import com.coworkhub.security.JwtFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain security(HttpSecurity http, JwtFilter jwt) throws Exception {
        return http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Frontend servido por Spring Boot (misma URL/origen).
                        .requestMatchers("/", "/index.html", "/css/**", "/js/**", "/favicon.ico").permitAll()
                        // Endpoints públicos.
                        .requestMatchers(
                                "/auth/login",
                                "/actuator/health",
                                "/swagger-ui/**",
                                "/doc/**",
                                "/v3/api-docs/**"
                        ).permitAll()
                        // El resto de la API requiere JWT.
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) -> {
                            response.setStatus(401);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write(
                                    "{\"error\":\"Autenticación requerida o token inválido\","
                                            + "\"codigo\":\"UNAUTHORIZED\","
                                            + "\"timestamp\":\"" + java.time.Instant.now() + "\"}"
                            );
                        })
                        .accessDeniedHandler((request, response, exception) -> {
                            response.setStatus(403);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write(
                                    "{\"error\":\"Permisos insuficientes\","
                                            + "\"codigo\":\"FORBIDDEN\","
                                            + "\"timestamp\":\"" + java.time.Instant.now() + "\"}"
                            );
                        })
                )
                .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class)
                .httpBasic(basic -> basic.disable())
                .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(
                "http://localhost:5500",
                "http://127.0.0.1:5500",
                "http://localhost:5501",
                "http://127.0.0.1:5501",
                "http://localhost:5502",
                "http://127.0.0.1:5502",
                "http://localhost:5503",
                "http://127.0.0.1:5503"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "Origin"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
