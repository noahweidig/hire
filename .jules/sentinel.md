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
