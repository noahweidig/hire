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
