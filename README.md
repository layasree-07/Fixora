# Fixora — Full-stack MVP source

Fixora is a React + Spring Boot + MySQL home-services MVP. It includes real API-backed registration/login, catalog, fixed-price package bookings, custom requests with a price entered before booking, servicer job acceptance, booking status transitions, chat, reviews, and an optional development-only arrival OTP reveal.

## Important readiness note
This is a functional MVP source package, not a claim of production certification. Before serving real customers, configure secure OTP delivery, HTTPS, production secrets, database backups, monitoring/rate limiting, privacy terms, and deployment-specific CORS. The custom-request screen records a fixed price entered by the customer; in-app servicer quote negotiation is not implemented yet. Calling masking, SMS/email delivery, web push, payments, and live GPS are not implemented.

## Requirements
- Java 17+
- Maven 3.9+
- Node.js 20+
- MySQL 8+

## 1. Configure MySQL
Create a database or allow the configured URL to create it:

```sql
CREATE DATABASE fixora CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Copy `.env.example` to `.env` and update your local values. Spring Boot does not automatically load `.env` in every terminal; set the variables in PowerShell before starting backend, or use the provided helper script.

PowerShell example:

```powershell
$env:DB_URL="jdbc:mysql://localhost:3306/fixora?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="YOUR_MYSQL_PASSWORD"
$env:JWT_SECRET="put-a-random-secret-of-at-least-32-characters-here"
$env:FRONTEND_ORIGIN="http://localhost:5173"
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="use-a-unique-password-12-chars-minimum"
$env:OTP_TEST_REVEAL="true"
```

`OTP_TEST_REVEAL=true` is for local development only. It stores active OTPs in application memory and exposes them only through the authenticated customer-only endpoint. Do not enable it in production. Without an OTP delivery provider, production customers cannot receive the code; configure a delivery provider before launch.

## 2. Run backend
Open terminal in `Fixora/backend`:

```powershell
mvn spring-boot:run
```

The API runs at `http://localhost:8080`. First startup applies Flyway migrations and seeds catalog items. If ADMIN_EMAIL and ADMIN_PASSWORD are configured, it creates the initial admin only if that email does not already exist.

## 3. Run frontend
Open a second terminal in `Fixora/frontend`:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`.

If backend is hosted somewhere else, create `frontend/.env` with:

```env
VITE_API_URL=https://your-api-host.example/api/v1
```

Restart Vite after changing environment variables.

## Current API overview
- `GET /api/v1/health`
- `GET /api/v1/services`
- `POST /api/v1/auth/register` (CUSTOMER or SERVICER only)
- `POST /api/v1/auth/login`
- `GET /api/v1/me`
- `POST /api/v1/bookings`, `GET /api/v1/bookings`
- `POST /api/v1/bookings/{id}/accept`
- `PATCH /api/v1/bookings/{id}/status`
- `POST /api/v1/bookings/{id}/verify-arrival`
- `GET /api/v1/bookings/{id}/arrival-code` (customer-only, development reveal only)
- `POST /api/v1/bookings/{id}/cancel`
- `GET/POST /api/v1/bookings/{id}/messages`
- `POST /api/v1/bookings/{id}/reviews`
- `GET /api/v1/admin/summary`

## Deployment checklist
1. Host MySQL with backups and restricted network access.
2. Deploy backend with secrets injected by the host; use a long random JWT secret and a unique admin password.
3. Deploy frontend and set `VITE_API_URL` to the deployed API URL.
4. Set `FRONTEND_ORIGIN` to the exact deployed frontend origin.
5. Use HTTPS, disable `OTP_TEST_REVEAL`, and configure real OTP delivery before real-world bookings.
6. Run smoke tests for customer, servicer, admin, unauthorized access, and concurrent job acceptance before launch.

## Scope limitations
No real phone-number masking/calling, SMS/email OTP, browser push notifications, payment gateway, or live GPS tracking is included in this MVP. The browser only opens navigation via ordinary links when that feature is added. These integrations require separate provider setup and privacy/security review.
