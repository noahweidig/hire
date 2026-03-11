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
