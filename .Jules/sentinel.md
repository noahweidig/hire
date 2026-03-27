
## 2026-03-24 - [Defense-in-depth: Secure Failure for Time-Based Bot Detection]
**Vulnerability:** A time-based bot protection check incorrectly used short-circuit evaluation (`loadTime && Date.now() - loadTime < 2000`), meaning if a bot tampered with the form and removed or invalidated the load time field (making `loadTime` evaluate to `NaN` or `0`), the condition evaluated to false, bypassing the 2-second minimum wait time entirely.
**Learning:** Client-side security checks must "fail securely." If the data required for the check is missing, invalid, or tampered with, the check should result in a rejection, not a bypass.
**Prevention:** When validating security-related timestamps or tokens on the client side, explicitly handle missing or invalid data by triggering the rejection condition (e.g., `!loadTime || Date.now() - loadTime < threshold`).

## 2026-03-27 - [Defense-in-depth: Adding Security Headers to static hosting configuration]
**Vulnerability:** A static site hosted on platforms that use `_headers` (like Netlify or Cloudflare Pages) may rely solely on `<meta>` tags for security policies (like CSP or Referrer-Policy). This leaves the site vulnerable to attacks like MIME-sniffing or browser-level clickjacking if security headers like `X-Content-Type-Options` or `X-Frame-Options` are not explicitly set in the HTTP response.
**Learning:** Certain critical security headers (like `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`) cannot be configured via `<meta>` tags and must be sent as HTTP response headers by the server.
**Prevention:** For statically hosted sites, always configure the platform's header file (e.g., `_headers`) to include baseline security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy: geolocation=(), camera=(), microphone=()`) for all paths (`/*`).
