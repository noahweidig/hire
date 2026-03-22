## 2026-02-28 - [Defense-in-depth: Require Trusted Types for Scripts]
**Vulnerability:** The application is built using vanilla JavaScript. While current practices do not show explicit insecure usages like `innerHTML`, future additions might unintentionally introduce DOM-based Cross-Site Scripting (DOM XSS) risks.
**Learning:** Adding the `require-trusted-types-for 'script'` CSP directive provides an extra layer of defense against DOM XSS by forcing strings to pass through Trusted Types policies before reaching injection sinks.
**Prevention:** In vanilla JS projects without framework-level protections against DOM XSS, enforcing Trusted Types via the CSP adds a robust safeguard.

## 2026-03-01 - [Defense-in-depth: Strict CSP and Trusted Types]
**Vulnerability:** The initial Content-Security-Policy included `require-trusted-types-for 'script'`, which is good. However, it did not explicitly disable policy creation via `trusted-types 'none'`. This could potentially allow an attacker to bypass Trusted Types if they find a way to inject a policy creation script, defeating the purpose of requiring Trusted Types in the first place. The original CSP also allowed `form-action 'self'` without any forms on the page, increasing the attack surface unnecessarily.
**Learning:** Enforcing Trusted Types with `require-trusted-types-for 'script'` is incomplete if the application does not strictly require creating its own custom Trusted Types policies. It's crucial to pair it with `trusted-types 'none'` to lock down policy creation completely.
**Prevention:** Always pair `require-trusted-types-for 'script'` with `trusted-types 'none'` when no custom policies are intentionally implemented. Eliminate unused permissions like `form-action` and restrict elements like `frame-src` to minimize the attack surface.

## 2026-03-02 - [Defense-in-depth: Stricter CSP Directives]
**Vulnerability:** The application's Content-Security-Policy allowed `base-uri 'self'` and `connect-src 'self'`. While not immediately exploitable, allowing `base-uri 'self'` could permit base tag injection if an attacker can upload a file or inject HTML. Allowing `connect-src 'self'` provides unnecessary permissions for a static site that does not make fetch/XHR requests.
**Learning:** Always apply the principle of least privilege to CSP directives. If a feature (like changing the base URI or making network requests) is not needed, its corresponding CSP directive should be set to `'none'` or removed.
**Prevention:** Restrict `base-uri` to `'none'` and remove unused directives like `connect-src` to minimize the attack surface.

## 2026-03-03 - [Defense-in-depth: Explicit 'none' for unused fetch directives]
**Vulnerability:** The application's Content-Security-Policy omitted the `connect-src` directive. Since `default-src` was set to `'self'`, any omitted fetch directives implicitly fall back to `'self'`. While this limits connections to the origin, it still represents an unnecessarily broad permission for a fully static site that makes no dynamic network requests, slightly increasing the attack surface.
**Learning:** In a CSP, omitting a directive does not mean it's blocked; it means it falls back to the `default-src` policy. To strictly block a capability, such as network connections (`connect-src`), it must be explicitly defined and set to `'none'`.
**Prevention:** For static sites with no dynamic network requests, explicitly set `connect-src 'none'` to definitively block data exfiltration attempts, rather than relying on an implicit `default-src 'self'` fallback.

## 2026-03-04 - [Defense-in-depth: Strict default-src]
**Vulnerability:** The application's Content-Security-Policy set `default-src` to `'self'`. This means that any resource type not explicitly defined in the CSP (like `media-src`, `worker-src`, `manifest-src`, etc.) would be allowed to load from the same origin. While better than allowing external sources, it still leaves a broader attack surface than necessary, especially for a fully static site that explicitly defines its required resource types (`script-src`, `style-src`, `img-src`, `font-src`).
**Learning:** A strict `default-src 'none'` policy is a fundamental security best practice. It acts as a safety net, ensuring that any new or overlooked resource types are blocked by default rather than permitted. It forces developers to explicitly allowlist only what is needed.
**Prevention:** Always start a CSP with `default-src 'none'` and explicitly define the allowed sources for specific directives based on the application's actual requirements.
## 2026-03-06 - [Defense-in-depth: Handling SecurityError from Browser Policies]
**Vulnerability:** Operations like accessing `localStorage` or `window.top` can throw a `SecurityError` when users have strict privacy settings (e.g., blocking third-party cookies) or when the application is embedded in a sandboxed iframe. Uncaught exceptions halt script execution, breaking unrelated functionality like intersection observers.
**Learning:** Browser security policies can cause standard DOM/Web APIs to throw exceptions unexpectedly. Applications must be defensive and anticipate these failures to prevent total application crashes.
**Prevention:** Always wrap operations that interact with browser storage (`localStorage`, `sessionStorage`, `indexedDB`) or top-level navigation (`window.top`) in `try...catch` blocks. Implement graceful fallbacks or silently suppress the errors to ensure the rest of the application remains functional (fail securely).

## 2026-03-07 - [Defense-in-depth: Secure Error Logging]
**Vulnerability:** The application was catching exceptions from `localStorage` and `window.top` and logging the full raw error object `e` to `console.warn`. While failing securely, this leaked internal browser state, stack traces, and potentially sensitive environment context into the client-side console.
**Learning:** Even when handling errors gracefully to prevent application crashes, it's critical to avoid exposing internal details. Exposing raw error objects (`e.stack`, `e.message`) gives potential attackers insight into the application's environment and execution flow.
**Prevention:** When logging errors to the console in client-side code, use generic, sanitized messages that describe the failure without passing the raw error object (e.g., `console.warn("Storage access denied.")` instead of `console.warn("Storage error:", e)`).

## 2026-03-08 - [Defense-in-depth: Explicit 'none' for unused worker directives]
**Vulnerability:** The application's Content-Security-Policy omitted the `worker-src` directive. Even though `default-src` was set to `'none'`, `worker-src` implicitly falls back to `script-src` which was set to `'self'`. This inadvertently allows Web Workers, Service Workers, and Shared Workers from the same origin. While not actively malicious on a fully static site, it opens a small, unnecessary attack surface if an attacker could upload or manipulate a file that could be executed as a worker.
**Learning:** In CSP, `worker-src` is unique because it falls back to `script-src`, not `default-src`. To strictly block all forms of workers when they are not needed, `worker-src` must be explicitly defined and set to `'none'`.
**Prevention:** For static sites or any site that does not utilize Web/Service Workers, explicitly set `worker-src 'none'` to block this capability, overriding the implicit fallback to `script-src`.

## 2026-03-09 - [Defense-in-depth: Comprehensive CSP Testing]
**Vulnerability:** The application implemented robust Content Security Policy (CSP) directives like `default-src 'none'`, `object-src 'none'`, `base-uri 'none'`, and `require-trusted-types-for 'script'`, but the automated test suite only verified a subset of them (e.g., `form-action`, `worker-src`). If a developer accidentally removed one of the untested directives, the regression would go unnoticed, silently weakening the defense-in-depth strategy.
**Learning:** A strong CSP is only as good as the tests that enforce its presence. Security headers and directives often break functionality if misconfigured, tempting developers to temporarily remove them for debugging and forget to restore them. Automated security-related validation is critical to prevent configuration drift.
**Prevention:** Always write explicit test assertions for every critical security directive in the CSP. When adding a new defense-in-depth directive (like `base-uri 'none'` or `upgrade-insecure-requests`), add a corresponding assertion in the test suite to ensure it remains active throughout the lifecycle of the project.

## 2026-03-12 - [Defense-in-depth: Invisible-by-default Clickjacking Timing]
**Vulnerability:** The 'invisible-by-default' clickjacking defense relied on a frame-busting check inside a deferred script (`script.js`). Because the script execution was deferred until after the document was parsed, the user could experience a visible flash of the hidden body or, more critically, a window of opportunity where the site could be framed and interacted with before the script executed and hid the page.
**Learning:** Security mechanisms that manipulate the initial rendering state (like hiding the page to prevent clickjacking) must execute as early as possible. Deferring these scripts delays protection and creates a race condition.
**Prevention:** Extract critical rendering-path security logic (like `anti-clickjack.css` and `anti-clickjack.js`) into separate, lightweight files and link them synchronously in the `<head>` *before* other assets. This guarantees the defense is active before the page is displayed or becomes interactive.

## 2026-03-14 - [Defense-in-depth: No-JS Availability for Clickjacking Defense]
**Vulnerability:** The 'invisible-by-default' clickjacking defense hides the page permanently for users with JavaScript disabled, effectively causing a self-imposed Denial of Service (Availability issue).
**Learning:** Security mechanisms that manipulate the initial rendering state via JavaScript must account for environments where JavaScript is disabled to maintain site availability.
**Prevention:** When implementing an 'invisible-by-default' JavaScript frame-busting defense (e.g., hiding the body with CSS), ensure availability for users with JavaScript disabled by including a fallback `<noscript>` stylesheet that restores visibility (e.g., `display: block !important`).

## 2026-03-17 - [Defense-in-depth: Input length limits for DoS prevention]
**Vulnerability:** Client-side input fields (`name`, `email`, `message` in the contact form) lacked `maxlength` attributes, allowing users to paste or type extremely large strings. This creates a risk for client-side Denial of Service (DoS) by causing browser memory issues, or submitting excessively large payloads to the backend or third-party service.
**Learning:** Client-side validation is a first line of defense. Restricting input length using standard HTML attributes mitigates risk by preventing excessively large data blobs from ever being processed or transmitted.
**Prevention:** Apply appropriate `maxlength` limits to all text input and textarea fields in forms (e.g., `100` for name, `254` for standard email addresses according to RFCs, and a reasonable limit like `5000` for free-text messages).
## 2026-03-19 - [Defense-in-depth: Hidden Honeypot for Automated Spam]
**Vulnerability:** Contact forms relying on third-party submission endpoints (like Formspree) without CAPTCHAs are vulnerable to automated spam submissions, reducing the signal-to-noise ratio and potentially causing annoyance or minor resource exhaustion.
**Learning:** Adding a native honeypot field (e.g., `_gotcha` for Formspree) is a low-friction way to silently drop automated submissions. However, under a strict CSP without `'unsafe-inline'`, inline styles (`style="display:none"`) cannot be used to hide the field.
**Prevention:** When implementing honeypot fields on sites with strict CSPs, use a dedicated CSS class in an external stylesheet (e.g., `.honeypot-field { display: none !important; }`) to reliably hide the element without violating policy or relying on inline styles.

## 2026-03-20 - [Defense-in-depth: Secure degradation of modern APIs]
**Vulnerability:** The application used the modern `IntersectionObserver` API directly without feature detection. In older browsers or restrictive environments (like certain headless test runners), this caused an unhandled JavaScript exception, halting execution context and potentially breaking critical subsequent security logic (like frame-busting scripts or secure event handlers).
**Learning:** Assuming browser API availability can lead to brittle "fail insecurely" scenarios. If an unhandled exception halts the main thread, any security mechanisms initialized later in the script or dependent on the event loop may fail silently, leaving the application unprotected.
**Prevention:** Always use feature detection (e.g., `if ('IntersectionObserver' in window)`) before invoking modern APIs. Ensure the application degrades gracefully to a safe fallback state (e.g., making hidden elements visible by default) to prevent unhandled exceptions from compromising the execution context.

## 2026-03-21 - [Defense-in-depth: Secure parsing of localStorage data]
**Vulnerability:** Unsafe parsing of `localStorage` data expected to be an array, which could lead to unhandled exceptions when calling array methods like `.filter` if the data is maliciously or accidentally modified to a different type.
**Learning:** Always validate the structure and type of parsed JSON data from `localStorage` before acting on it.
**Prevention:** Use `Array.isArray()` or similar checks to ensure the parsed data matches the expected type before executing type-specific operations, mitigating potential application crashes.
