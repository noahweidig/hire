## 2024-02-12 - Optimization Learning
**Learning:** Found excessive DOM size (450+ nodes) in the skills marquee and a large unoptimized logo (87KB) in the LCP area. Missing tooling prevented image resizing.
**Action:** Implemented `content-visibility: auto` on off-screen sections to defer the heavy DOM rendering, improving initial paint metrics.

## 2026-02-20 - Scroll Animation Optimization
**Learning:** Global scroll event listener caused main thread congestion and race conditions in IntersectionObserver logic (visible elements staying visible on scroll up).
**Action:** Removed scroll listener and derived scroll direction from `IntersectionObserverEntry.boundingClientRect.top` relative to viewport.

## 2026-02-25 - Back to Top Optimization
**Learning:** Scroll event listeners for UI visibility toggles are inefficient and can be replaced by IntersectionObserver on a top-level element (like #hero). However, robustness is key: if the target element is missing, fallback logic (like the original scroll listener) must be preserved to avoid feature breakage.
**Action:** Replaced scroll listener with IntersectionObserver on #hero, with a fallback to scroll listener if #hero is missing or IO is unsupported.

## 2026-03-10 - UI Animation Optimization
**Learning:** Animating position properties like `left` or `top` causes continuous layout calculations and paints on the main thread, resulting in jank during scroll and resize events. The `.nav-links::before` indicator previously animated the `left` property directly based on JS-provided CSS variables.
**Action:** Replaced `left` transitions with `transform: translate()` driven by CSS variables to push the animation work to the GPU compositor layer, adding `will-change: transform` to optimize performance.
