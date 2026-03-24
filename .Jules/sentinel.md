
## 2026-03-24 - [Defense-in-depth: Secure Failure for Time-Based Bot Detection]
**Vulnerability:** A time-based bot protection check incorrectly used short-circuit evaluation (`loadTime && Date.now() - loadTime < 2000`), meaning if a bot tampered with the form and removed or invalidated the load time field (making `loadTime` evaluate to `NaN` or `0`), the condition evaluated to false, bypassing the 2-second minimum wait time entirely.
**Learning:** Client-side security checks must "fail securely." If the data required for the check is missing, invalid, or tampered with, the check should result in a rejection, not a bypass.
**Prevention:** When validating security-related timestamps or tokens on the client side, explicitly handle missing or invalid data by triggering the rejection condition (e.g., `!loadTime || Date.now() - loadTime < threshold`).
