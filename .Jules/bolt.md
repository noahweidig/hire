## 2026-03-26 - Cache DOM Reads Outside of High-Frequency Animation Loops
**Learning:** Calling `document.body.getAttribute('data-theme')` inside a high-frequency animation loop (like `requestAnimationFrame`) causes unnecessary synchronous main-thread layout recalculations. While technically not "layout thrashing" (since it's a DOM read, not a layout property like `.offsetHeight`), it is still an inefficient DOM API call that wastes processing time.
**Action:** Always hoist DOM attribute reads completely outside of animation loops by caching the state in a local variable, and update that variable via a state-change listener (e.g., an `onThemeChange` event listener).

## 2026-03-26 - Debounce Heavy Allocations on Resize
**Learning:** High-frequency `resize` events triggering heavy canvas operations (like `OffscreenCanvas` allocations in `createNodes`) can cause severe main-thread lag and GC pressure.
**Action:** Debounce the heavy allocation functions (e.g., using a 150ms timeout) while allowing lightweight structural canvas resizes to fire immediately for visual continuity.
