# Security Design

## Authentication

Trade Abhyas uses email and password authentication. Passwords are hashed with bcrypt before storage. Plain-text passwords are never stored.

## Session Management

The platform uses:

- A JWT access token stored in an HTTP-only cookie.
- A refresh token stored in an HTTP-only cookie.
- A hashed refresh-token record in the database.

Refresh tokens can be revoked during logout, password reset, or session replacement.

## Authorization

The backend separates normal users and administrators through a role field. Admin routes require authentication and the admin role. Normal users cannot access admin APIs.

## Password Reset

Password reset uses a random reset token. The database stores only a SHA-256 hash of the reset token along with an expiry time. After successful reset, the token is cleared, the user's token version is incremented, and existing refresh sessions are revoked.

## Cookie and CORS Controls

The backend uses an origin allowlist based on configured user and admin frontend URLs. Cookies are configured for credentialed requests. Production configuration validates required security-related environment values before startup.

## Backend Security Middleware

The backend includes security middleware for:

- HTTP security headers.
- CORS control.
- Cookie parsing.
- MongoDB query sanitization.
- XSS cleanup.
- Rate limiting in production.

## Data Minimization

Because Trade Abhyas is a virtual trading platform, it does not ask for or store banking credentials, PAN card details, demat account details, brokerage account credentials, UPI information, or real-money payment information.

Allowed profile data is limited to application-relevant information such as name, email address, mobile number, avatar/profile preferences, trading experience, risk preference, trading style, and notification preferences.

## Secrets Handling

Secrets such as database connection strings, JWT secrets, cookie secrets, market API keys, and email provider keys are expected to be supplied through environment variables. Documentation and source control should not contain secret values.

## Security Boundaries

Trade Abhyas is intended for educational paper trading. It does not provide real financial advice, real trade execution, real money transfer, or brokerage compliance functionality.

