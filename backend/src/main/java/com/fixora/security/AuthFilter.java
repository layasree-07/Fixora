package com.fixora.security;
import jakarta.servlet.*; import jakarta.servlet.http.*; import java.io.IOException; import org.springframework.stereotype.Component; import org.springframework.web.filter.OncePerRequestFilter; import org.springframework.security.core.context.SecurityContextHolder; import org.springframework.security.authentication.UsernamePasswordAuthenticationToken; import org.springframework.security.core.authority.SimpleGrantedAuthority; import java.util.List;
@Component public class AuthFilter extends OncePerRequestFilter {
 private final TokenService tokens; public AuthFilter(TokenService t){tokens=t;}
 @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{String h=req.getHeader("Authorization"); if(h!=null&&h.startsWith("Bearer ")){String[] v=tokens.verify(h.substring(7));if(v!=null){var a=new UsernamePasswordAuthenticationToken(v[0]+"|"+v[1]+"|"+v[2],null,List.of(new SimpleGrantedAuthority("ROLE_"+v[1])));SecurityContextHolder.getContext().setAuthentication(a);}}chain.doFilter(req,res);}
}
