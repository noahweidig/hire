## 2026-02-28 - [Defense-in-depth: Require Trusted Types for Scripts]
**Vulnerability:** The application is built using vanilla JavaScript. While current practices do not show explicit insecure usages like `innerHTML`, future additions might unintentionally introduce DOM-based Cross-Site Scripting (DOM XSS) risks.
**Learning:** Adding the `require-trusted-types-for 'script'` CSP directive provides an extra layer of defense against DOM XSS by forcing strings to pass through Trusted Types policies before reaching injection sinks.
**Prevention:** In vanilla JS projects without framework-level protections against DOM XSS, enforcing Trusted Types via the CSP adds a robust safeguard.
