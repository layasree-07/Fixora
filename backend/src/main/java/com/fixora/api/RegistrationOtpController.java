
package com.fixora.api;

import com.fixora.model.User;
import com.fixora.repo.UserRepo;
import com.fixora.security.TokenService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1/auth/register")
public class RegistrationOtpController {

    private final UserRepo users;
    private final PasswordEncoder encoder;
    private final TokenService tokens;
    private final JavaMailSender mailSender;
    private final SecureRandom random = new SecureRandom();

    private final ConcurrentHashMap<String, PendingRegistration> pending =
            new ConcurrentHashMap<>();

    public RegistrationOtpController(
            UserRepo users,
            PasswordEncoder encoder,
            TokenService tokens,
            JavaMailSender mailSender) {
        this.users = users;
        this.encoder = encoder;
        this.tokens = tokens;
        this.mailSender = mailSender;
    }

    public record RegisterRequest(
            @NotBlank @Size(max = 100) String name,
            @Email @NotBlank @Size(max = 190) String email,
            @NotBlank @Size(min = 8, max = 100) String password,
            @NotBlank @Pattern(regexp = "CUSTOMER|SERVICER") String role) {}

    public record VerifyRequest(
            @Email @NotBlank String email,
            @NotBlank @Pattern(regexp = "\\d{6}") String code) {}

    private record PendingRegistration(
            String name,
            String email,
            String passwordHash,
            String role,
            String otpHash,
            Instant expiresAt,
            int attempts) {}

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(
            @Valid @RequestBody RegisterRequest req) {

        String email = req.email().trim().toLowerCase();

        if (users.existsByEmailIgnoreCase(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Email is already registered."));
        }

        String code = String.format("%06d", random.nextInt(1_000_000));

        PendingRegistration registration = new PendingRegistration(
                req.name().trim(),
                email,
                encoder.encode(req.password()),
                req.role(),
                hash(code),
                Instant.now().plusSeconds(300),
                0);

        pending.put(email, registration);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("Fixora - Email Verification");
            message.setText(
                    "Your Fixora verification code is: " + code
                    + "\n\nThis code expires in 5 minutes."
                    + "\nDo not share this code with anyone.");

            mailSender.send(message);

            return ResponseEntity.ok(Map.of(
                    "message", "OTP sent. Check your email; it expires in 5 minutes."));

        } catch (Exception ex) {
            pending.remove(email, registration);

            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                            "error", "Could not send OTP. Check your email configuration."));
        }
    }

    @PostMapping("/verify-otp")
    public synchronized ResponseEntity<?> verifyOtp(
            @Valid @RequestBody VerifyRequest req) {

        String email = req.email().trim().toLowerCase();
        PendingRegistration registration = pending.get(email);

        if (registration == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "No pending registration. Request a new OTP."));
        }

        if (!Instant.now().isBefore(registration.expiresAt())) {
            pending.remove(email);
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "OTP expired. Request a new OTP."));
        }

        if (registration.attempts() >= 5) {
            pending.remove(email);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of(
                            "error", "Too many incorrect attempts. Request a new OTP."));
        }

        boolean matches = MessageDigest.isEqual(
                registration.otpHash().getBytes(StandardCharsets.UTF_8),
                hash(req.code()).getBytes(StandardCharsets.UTF_8));

        if (!matches) {
            pending.put(email, new PendingRegistration(
                    registration.name(),
                    registration.email(),
                    registration.passwordHash(),
                    registration.role(),
                    registration.otpHash(),
                    registration.expiresAt(),
                    registration.attempts() + 1));

            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Incorrect OTP. Please try again."));
        }

        if (users.existsByEmailIgnoreCase(email)) {
            pending.remove(email);
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Email is already registered."));
        }

        User user = new User();
        user.name = registration.name();
        user.email = registration.email();
        user.passwordHash = registration.passwordHash();
        user.role = registration.role();
        user.enabled = true;

        users.save(user);
        pending.remove(email);

        String token = tokens.issue(user.id, user.role, user.email);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Email verified. Account created successfully.",
                "token", token,
                "user", Map.of(
                        "id", user.id,
                        "name", user.name,
                        "email", user.email,
                        "role", user.role)));
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] result = digest.digest(
                    value.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(result);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash OTP", ex);
        }
    }
}

