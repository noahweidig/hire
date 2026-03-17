## 2024-05-21 - Portfolio Print Styles
**Learning:** Portfolio sites are frequently printed or saved as PDFs by recruiters, but CSS grids and animations (like marquees) often break this layout.
**Action:** Always include a basic `@media print` block that linearizes grids, hides interactive-only elements (nav, themes), and ensures high contrast for text.

## 2026-02-27 - Icon-Only Tooltips & External Link Warnings
**Learning:** Sighted users rely on hover tooltips for icon-only buttons (like theme toggles), while screen-reader users require explicit contextual warnings when a link behaves unexpectedly (like opening a new tab).
**Action:** Always add native `title` attributes (mirroring `aria-label`) to icon buttons. For links with `target="_blank"`, consistently append `<span class="sr-only"> (opens in a new tab)</span>` to prevent disorienting context shifts for AT users.

## 2026-02-28 - Scrollspy Navigation State
**Learning:** While visual classes (like `.active`) indicate the current section in a scrollspy navigation, screen readers remain unaware of this context change during scroll.
**Action:** Programmatically sync the active section by applying `aria-current="true"` to the current navigation link, removing it from siblings as the user scrolls.

## 2026-03-02 - Redundant Logo Text & Decorative Emojis
**Learning:** Screen readers announce emojis natively (e.g., "Bar chart" for 📊), which can clutter project titles if the emoji is purely decorative. Furthermore, having a logo image with alt text immediately preceding the exact same brand text creates redundant and annoying announcements (e.g., "Noah Weidig logo Noah Weidig").
**Action:** Always wrap decorative emojis in `<span aria-hidden="true">` to prevent screen reader clutter, and use `alt=""` along with `aria-hidden="true"` on logo images when the brand name is clearly provided in adjacent visible text. Additionally, provide `title="Opens in a new tab"` attributes on external cards/links so sighted users receive the same expectation as screen reader users before clicking.

## 2026-03-03 - Smooth Scrolling & Reduced Motion
**Learning:** While `scroll-behavior: smooth` provides a pleasant navigation experience for most, it can trigger nausea or dizziness for users with vestibular disorders. The `@media (prefers-reduced-motion: reduce)` media query is commonly used for CSS animations but is easily forgotten for document-level smooth scrolling.
**Action:** Always include `html { scroll-behavior: auto !important; }` within the `prefers-reduced-motion` block to ensure anchor links jump instantly for these users, and ensure JavaScript-driven scrolls (like Back to Top buttons) also respect this OS-level preference.

## 2026-03-07 - Structural Section Landmark Accessibility
**Learning:** HTML5 `<section>` elements are not automatically exposed as landmark regions to assistive technologies unless they are explicitly provided with an accessible name. Without this, main content areas might be skipped in the screen reader's landmark rotor while smaller marked components (like interactive regions) are included.
**Action:** Always provide an explicit accessible name to primary `<section>` elements using `aria-labelledby` referencing their heading, or `aria-label` if no visible heading exists, to elevate them into the landmark hierarchy for macro-navigation.

## 2026-03-09 - Keyboard Shortcut Discoverability
**Learning:** Power users frequently appreciate keyboard shortcuts for global actions (like toggling themes), but these features remain completely hidden without proper discoverability hints in the UI. Sighted users rely on tooltips to learn these shortcuts.
**Action:** When adding global keyboard shortcuts, always surface them in the native `title` attribute tooltip (e.g., `title="Toggle dark mode (T)"`) so users discover them naturally during hover interactions without visual clutter.

## 2026-03-10 - Active State Tactile Feedback
**Learning:** Adding hover elevations (`transform: translateY(-Xpx)`) without a corresponding `:active` state leaves interactive elements feeling floaty and unresponsive during actual clicks, depriving users of immediate visual confirmation that their input registered.
**Action:** Always pair hover transformations with an `:active` state that uses a fast transition (e.g., `0.1s`) and a slight scale-down (e.g., `transform: scale(0.96)`) to simulate a physical "press" and ground the element.

## 2026-03-11 - Minimum Accessible Touch Targets
**Learning:** Icon-only buttons (like a theme toggle or mobile back-to-top button) often fall below the WCAG 2.1 minimum recommended touch target size of 44x44px. Changing their visible dimensions can break the layout or visual constraints.
**Action:** Use an invisible `::after` pseudo-element with `min-width: 44px; min-height: 44px;` positioned absolutely over the center of the button. This expands the clickable touch area without altering the component's visible design. For fixed-size elements like `.back-to-top` in media queries, simply ensure their dimensions don't scale below 44px.

## 2026-03-11 - Programmatic Focus Outlines
**Learning:** Elements like `<main>` or `<section>` that use `tabindex="-1"` to manage programmatic focus (e.g., for skip links or scrollspy navigation) can display unsightly, massive focus rings in some browsers when they receive focus, confusing users.
**Action:** Always remove the default outline for elements with `tabindex="-1"` using `[tabindex="-1"]:focus { outline: none !important; }` to maintain a clean visual experience while preserving screen reader focus management.

## 2026-03-11 - Interactive Navigation Indicators
**Learning:** A static "active section" navigation indicator informs users of their current scroll position, but adding interactive tracking (where the indicator smoothly follows mouse hover or keyboard focus) provides immediate, satisfying tactile feedback that makes the UI feel highly responsive and alive.
**Action:** When implementing sliding navigation indicators, bind them to both `mouseenter` and `focus` events on nav links, and ensure they gracefully return to the current active section on `mouseleave` or `focusout`.

## 2026-03-11 - Focus State Parity with Hover Effects
**Learning:** Providing a visible focus ring is baseline accessibility, but failing to trigger the same visual elevations, color shifts, and shadow expansions as hover states leaves keyboard users with a visually degraded, less responsive experience.
**Action:** Always pair `:hover` pseudo-classes with `:focus-visible` when defining rich interaction styles (like `transform` and `box-shadow`) to ensure a polished, egalitarian experience across all input modalities.

## 2026-03-12 - IntersectionObserver rootMargin Offset Calculations
**Learning:** When using IntersectionObserver with a `rootMargin` offset (e.g., `-6%` to trigger animations before elements fully enter the viewport), calculating whether an element has exited via the top or bottom of the screen cannot blindly rely on `rect.top >= window.innerHeight`. Due to the offset, the threshold occurs *before* the literal bottom of the window, leading to animation bugs where elements never reset their state if they fall in that 6% gap.
**Action:** When manually determining exit directions inside an `IntersectionObserver` callback that uses `rootMargin` offsets, use relative directional logic (like `rect.top > 0` for exiting bottom) rather than strict screen-dimension equality checks to ensure bulletproof state resets.

## 2024-05-28 - Enhancing Text Contrast for WCAG AA
**Learning:** Subtle text colors used for subheadings or secondary text (like `--accent-slate` `#64748b` on `--bg-off-white` `#f6f7fb`) can fail WCAG AA 4.5:1 contrast requirements for normal text by a very small margin (4.45:1).
**Action:** Darkened the `--accent-slate` variable slightly to `#596a7f`, achieving a 5.17:1 contrast ratio to meet WCAG AA standards while maintaining the original brand aesthetic.

## 2026-03-13 - Visual Cues for External Context Shifts
**Learning:** While `sr-only` text and `title` attributes provide essential context to screen reader and some sighted users about links opening in new tabs, many sighted users do not hover long enough to read tooltips before clicking. This leads to unexpected context shifts when a link looks like internal navigation (e.g., a project card) but acts like an external exit.
**Action:** Always pair `sr-only` external link warnings with a visible, semantic external link icon (like `external-link.svg`) for sighted users. Ensure the icon is `aria-hidden="true"` to prevent redundant screen reader announcements, and provide subtle hover animations to reinforce interactivity.

## 2024-05-18 - Prevent Unexpected Context Shifts
**Learning:** External links (`target="_blank"`) without visual cues cause unexpected context shifts for sighted users, disrupting the flow. Appending a consistent, subtly animated external link icon solves this gracefully.
**Action:** Always append an external link icon to primary CTAs that navigate off-site, applying consistent hover states (`transform: translate(2px, -2px)`) for tactile feedback.

## 2025-03-03 - Form Validation Accessibility and Error Recovery
**Learning:** Visual inline form errors are easily missed by screen reader users if not explicitly linked to the input, and manual error recovery can be disorienting for keyboard users.
**Action:** When implementing custom form validation, always programmatically tie the error message to the input using `aria-invalid` and `aria-describedby`, and automatically shift focus (`.focus()`) to the first invalid field upon a failed submission.
