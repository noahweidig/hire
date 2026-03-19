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

## 2026-03-11 - Playwright Loop Optimization
**Learning:** Sequential Playwright locator operations (like `count()` or `get_attribute()`) inside loops cause excessive network round-trips between the test runner and browser context, drastically slowing down test execution on larger DOM subsets.
**Action:** Replaced loop-based attribute fetching with bulk data retrieval using `page.evaluate()` to extract all necessary DOM data in a single round-trip, yielding significantly faster and more stable tests.

## 2026-03-12 - matchMedia Query Optimization
**Learning:** Calling `window.matchMedia()` inside an event handler (like a click listener) triggers a synchronous style and layout recalculation on the main thread, leading to potential jank before the primary action (like a smooth scroll) even begins.
**Action:** Always cache `window.matchMedia` queries outside of event listeners and read their `.matches` property (which is live) inside the handler to prevent unnecessary synchronous recalculations.

## 2026-03-15 - Loop DOM Query Optimization
**Learning:** Querying a parent element's bounding rectangle (e.g., `navList.getBoundingClientRect()`) inside a loop over its children causes redundant synchronous layout recalculations (thrashing) on the main thread.
**Action:** Hoist the parent's layout calculation outside of the loop and pass the cached result into the per-child calculation function to reduce DOM read overhead.
## 2026-03-19 - DOM Query Layout Thrashing Optimization
**Learning:** Querying a layout-dependent property like `getBoundingClientRect()` and then immediately causing a layout-altering operation (or conditional variable logic tightly coupled to styles) inside loops across multiple elements forces the browser to synchronously recalculate layout on the main thread.
**Action:** Separated DOM reads and writes into distinct, sequential passes. First, map over all elements to cache their bounding boxes, then loop over the cached data to perform writes like `classList.add()` to prevent layout thrashing.
