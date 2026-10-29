package plus.oneteam.merchant_admin_backend.config;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Value("${app.keycloak.client-id}")
    private String clientId;

    @Value("${app.cors.allowed-origins:http://localhost:3000}")
    private List<String> allowedOrigins;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable) // stateless API using bearer tokens, no cookies
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // CORS preflight
                        .requestMatchers("/images/**").permitAll()               // product images
                        // Add public callbacks here, e.g. the payment gateway webhook:
                        // .requestMatchers("/api/payments/callback/**").permitAll()
                        .anyRequest().hasRole("ADMIN"))
                .oauth2ResourceServer(oauth -> oauth
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));

        return http.build();
    }

    /** Turns Keycloak client roles (resource_access.<client>.roles) into ROLE_* authorities. */
    private Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(this::extractAuthorities);
        // Show the Keycloak username in Authentication#getName()
        converter.setPrincipalClaimName("preferred_username");
        return converter;
    }

    @SuppressWarnings("unchecked")
    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        List<GrantedAuthority> authorities = new ArrayList<>();

        // Client roles: resource_access.merchant-admin.roles
        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess != null && resourceAccess.get(clientId) instanceof Map<?, ?> client) {
            Object roles = client.get("roles");
            if (roles instanceof Collection<?> list) {
                list.forEach(r -> authorities.add(
                        new SimpleGrantedAuthority("ROLE_" + r.toString().toUpperCase())));
            }
        }

        // Realm roles: realm_access.roles (if you ever use those instead)
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess != null && realmAccess.get("roles") instanceof Collection<?> list) {
            list.forEach(r -> authorities.add(
                    new SimpleGrantedAuthority("ROLE_" + r.toString().toUpperCase())));
        }

        return authorities;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}