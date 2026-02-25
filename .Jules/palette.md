## 2024-05-21 - Portfolio Print Styles
**Learning:** Portfolio sites are frequently printed or saved as PDFs by recruiters, but CSS grids and animations (like marquees) often break this layout.
**Action:** Always include a basic `@media print` block that linearizes grids, hides interactive-only elements (nav, themes), and ensures high contrast for text.
