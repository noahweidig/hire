## 2025-05-21 - [LCP Image Preload]
**Learning:** Preloading the hero image (LCP candidate) is a high-impact, low-risk optimization for single-page sites.
**Action:** Always check for critical above-the-fold assets that are not immediately discoverable by the preload scanner (e.g., background images or late-body img tags) and add `<link rel="preload">`.
