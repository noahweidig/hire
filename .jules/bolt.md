## 2024-02-12 - Optimization Learning
**Learning:** Found excessive DOM size (450+ nodes) in the skills marquee and a large unoptimized logo (87KB) in the LCP area. Missing tooling prevented image resizing.
**Action:** Implemented `content-visibility: auto` on off-screen sections to defer the heavy DOM rendering, improving initial paint metrics.

## 2026-02-20 - Scroll Animation Optimization
**Learning:** Global scroll event listener caused main thread congestion and race conditions in IntersectionObserver logic (visible elements staying visible on scroll up).
**Action:** Removed scroll listener and derived scroll direction from `IntersectionObserverEntry.boundingClientRect.top` relative to viewport.
