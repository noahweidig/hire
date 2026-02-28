## 2024-05-21 - Portfolio Print Styles
**Learning:** Portfolio sites are frequently printed or saved as PDFs by recruiters, but CSS grids and animations (like marquees) often break this layout.
**Action:** Always include a basic `@media print` block that linearizes grids, hides interactive-only elements (nav, themes), and ensures high contrast for text.

## 2026-02-27 - Icon-Only Tooltips & External Link Warnings
**Learning:** Sighted users rely on hover tooltips for icon-only buttons (like theme toggles), while screen-reader users require explicit contextual warnings when a link behaves unexpectedly (like opening a new tab).
**Action:** Always add native `title` attributes (mirroring `aria-label`) to icon buttons. For links with `target="_blank"`, consistently append `<span class="sr-only"> (opens in a new tab)</span>` to prevent disorienting context shifts for AT users.
## 2026-02-28 - Scrollspy Navigation State
**Learning:** While visual classes (like `.active`) indicate the current section in a scrollspy navigation, screen readers remain unaware of this context change during scroll.
**Action:** Programmatically sync the active section by applying `aria-current="true"` to the current navigation link, removing it from siblings as the user scrolls.
