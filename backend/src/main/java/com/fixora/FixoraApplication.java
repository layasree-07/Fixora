package com.fixora;
import com.fixora.model.User; import com.fixora.repo.UserRepo; import org.springframework.boot.SpringApplication; import org.springframework.boot.autoconfigure.SpringBootApplication; import org.springframework.boot.ApplicationRunner; import org.springframework.context.annotation.Bean; import org.springframework.security.crypto.password.PasswordEncoder; import org.springframework.beans.factory.annotation.Value;
@SpringBootApplication
public class FixoraApplication {
 public static void main(String[] args){SpringApplication.run(FixoraApplication.class,args);}
 @Bean ApplicationRunner seedAdmin(UserRepo users, PasswordEncoder encoder, @Value("${ADMIN_EMAIL:}") String email, @Value("${ADMIN_PASSWORD:}") String password){return args->{if(email!=null&&!email.isBlank()&&password!=null&&password.length()>=12&&!users.existsByEmailIgnoreCase(email)){User u=new User();u.name="Fixora Administrator";u.email=email.trim().toLowerCase();u.passwordHash=encoder.encode(password);u.role="ADMIN";u.enabled=true;users.save(u);System.out.println("Fixora admin account created from environment configuration.");}};}
}
