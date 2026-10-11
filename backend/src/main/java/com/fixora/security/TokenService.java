package com.fixora.security;
import javax.crypto.Mac; import javax.crypto.spec.SecretKeySpec; import java.nio.charset.StandardCharsets; import java.util.Base64; import org.springframework.beans.factory.annotation.Value; import org.springframework.stereotype.Service;
@Service public class TokenService {
 @Value("${fixora.jwt.secret}") private String secret;
 public String issue(Long id,String role,String email){String payload=id+":"+role+":"+email+":"+(System.currentTimeMillis()+86400000L); String p=Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8)); return p+"."+sign(p);}
 public String[] verify(String token){try{String[] a=token.split("\\."); if(a.length!=2||!sign(a[0]).equals(a[1]))return null; String p=new String(Base64.getUrlDecoder().decode(a[0]),StandardCharsets.UTF_8); String[] v=p.split(":",4); if(v.length!=4||Long.parseLong(v[3])<System.currentTimeMillis())return null; return v;}catch(Exception e){return null;}}
 private String sign(String value){try{Mac m=Mac.getInstance("HmacSHA256");m.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));return Base64.getUrlEncoder().withoutPadding().encodeToString(m.doFinal(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
}

