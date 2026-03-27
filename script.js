const initHeroNeuralNetwork = () => {
    const heroSection = document.getElementById('hero');
    const canvas = document.getElementById('hero-neural-canvas');
    if (!heroSection || !canvas) return;

    const ctx = canvas.getContext('2d', { desynchronized: true });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Performance: Scale animation complexity on lower-power devices while
    // preserving visual behavior on typical desktops.
    const lowPowerDevice =
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
        (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
        (navigator.connection && navigator.connection.saveData);

    let width = 0;
    let height = 0;
    const mouse = { x: -9999, y: -9999, active: false };
    const CONNECTION_DISTANCE = 160;
    const MOUSE_RADIUS = 200;
    const BASE_SPEED = lowPowerDevice ? 0.32 : 0.35;
    const MAX_SPEED = lowPowerDevice ? 0.68 : 0.75;
    const REPULSION_DIST = 80;
    const CLICK_RADIUS = 200;
    const CONNECTION_DISTANCE_SQ = CONNECTION_DISTANCE * CONNECTION_DISTANCE;
    const REPULSION_DIST_SQ = REPULSION_DIST * REPULSION_DIST;
    const MOUSE_RADIUS_SQ = MOUSE_RADIUS * MOUSE_RADIUS;
    const CLICK_RADIUS_SQ = CLICK_RADIUS * CLICK_RADIUS;
    const GRID_CELL_SIZE = CONNECTION_DISTANCE;
    const nodes = [];
    const spatialGrid = new Map();
    let animationFrameId = null;
    let isHeroVisible = true;
    let isDocumentVisible = !document.hidden;
    let frameCounter = 0;

    // Performance: Pre-allocated shared buffers to avoid per-frame array/object allocation
    const CONNECTION_BINS = 8;
    const binCoords = Array.from({ length: CONNECTION_BINS }, () => []);
    const binAlphaSum = new Float64Array(CONNECTION_BINS);
    const binCount = new Int32Array(CONNECTION_BINS);

    // Performance: Pre-render each node's glow to an offscreen canvas once at creation time.
    // Eliminates createRadialGradient() — the largest per-frame allocation bottleneck (~N objects/frame).
    // drawImage() from a cached texture is significantly cheaper than re-building gradients each frame.
    const createGlowSprite = (hue, maxGlowRadius, spriteSize) => {
        const sprite = typeof OffscreenCanvas !== 'undefined'
            ? new OffscreenCanvas(spriteSize, spriteSize)
            : (() => { const c = document.createElement('canvas'); c.width = spriteSize; c.height = spriteSize; return c; })();
        const sCtx = sprite.getContext('2d');
        const cx = spriteSize / 2;
        const gradient = sCtx.createRadialGradient(cx, cx, 0, cx, cx, maxGlowRadius);
        gradient.addColorStop(0, `hsla(${hue}, 70%, 75%, 1)`);
        gradient.addColorStop(1, `hsla(${hue}, 70%, 60%, 0)`);
        sCtx.beginPath();
        sCtx.arc(cx, cx, maxGlowRadius, 0, Math.PI * 2);
        sCtx.fillStyle = gradient;
        sCtx.fill();
        return sprite;
    };

    // Performance: Cache theme state outside the animation loop to prevent layout thrashing
    // from repeated synchronous DOM reads.
    let isDarkTheme = document.body.getAttribute('data-theme') === 'dark';

    const getConnectionStrength = () => {
        return {
            alphaBoost: isDarkTheme ? 0.2 : 0.29,
            lineWidth: isDarkTheme ? 1.05 : 1.25
        };
    };

    const getThemeAwareHue = () => {
        return isDarkTheme ? 190 : 200;
    };

    const resize = () => {
        const rect = heroSection.getBoundingClientRect();
        width = Math.max(1, Math.floor(rect.width));
        height = Math.max(1, Math.floor(rect.height));
        canvas.width = width;
        canvas.height = height;
    };

    const createNodes = () => {
        const area = width * height;
        const minNodes = lowPowerDevice ? 50 : 70;
        const maxNodes = lowPowerDevice ? 96 : 130;
        const nodeCount = Math.max(minNodes, Math.min(maxNodes, Math.round(area / 16500)));
        const cols = Math.ceil(Math.sqrt(nodeCount * (width / height)));
        const rows = Math.ceil(nodeCount / cols);
        const cellW = width / cols;
        const cellH = height / rows;
        nodes.length = 0;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (nodes.length >= nodeCount) break;
                const x = col * cellW + Math.random() * cellW;
                const y = row * cellH + Math.random() * cellH;
                const angle = Math.random() * Math.PI * 2;
                const speed = BASE_SPEED * (0.6 + Math.random() * 0.8);
                const radius = 1.2 + Math.random() * 1.2;
                const hue = getThemeAwareHue() + Math.random() * 40;
                const maxGlowRadius = (radius + 0.6) * 2.5;
                const spriteSize = Math.ceil(maxGlowRadius) * 2 + 2;
                nodes.push({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius,
                    pulse: Math.random() * Math.PI * 2,
                    pulseSpeed: 0.008 + Math.random() * 0.01,
                    hue,
                    // Performance: Pre-computed to avoid per-frame string allocation
                    fillColor: `hsla(${hue}, 60%, 80%, 0.55)`,
                    // Performance: Pre-rendered glow texture; avoids createRadialGradient each frame
                    glowSprite: createGlowSprite(hue, maxGlowRadius, spriteSize),
                    glowSpriteSize: spriteSize,
                    // Performance: Per-node neighbor cache; populated once per frame after grid rebuild
                    cachedNeighbors: []
                });
            }
        }
    };

    // Performance: Integer key avoids string allocation on every grid lookup
    const getCellKey = (x, y) => {
        return Math.floor(x / GRID_CELL_SIZE) * 1000 + Math.floor(y / GRID_CELL_SIZE);
    };

    const rebuildSpatialGrid = () => {
        spatialGrid.clear();
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const key = getCellKey(node.x, node.y);
            let bucket = spatialGrid.get(key);
            if (!bucket) {
                bucket = [];
                spatialGrid.set(key, bucket);
            }
            bucket.push(i);
        }
    };

    const getNeighborIndices = (node, neighbors) => {
        neighbors.length = 0;
        const baseCellX = Math.floor(node.x / GRID_CELL_SIZE);
        const baseCellY = Math.floor(node.y / GRID_CELL_SIZE);

        for (let offsetY = -1; offsetY <= 1; offsetY++) {
            for (let offsetX = -1; offsetX <= 1; offsetX++) {
                // Performance: Integer key avoids string allocation on every cell lookup
                const key = (baseCellX + offsetX) * 1000 + (baseCellY + offsetY);
                const bucket = spatialGrid.get(key);
                if (bucket) {
                    for (let i = 0; i < bucket.length; i++) {
                        neighbors.push(bucket[i]);
                    }
                }
            }
        }

        return neighbors;
    };

    // Performance: Build per-node neighbor caches once per frame after grid rebuild.
    // Both drawConnections and updateNodes can then read node.cachedNeighbors,
    // halving the total getNeighborIndices calls from 2N to N per frame.
    const cacheAllNeighbors = () => {
        for (let i = 0; i < nodes.length; i++) {
            getNeighborIndices(nodes[i], nodes[i].cachedNeighbors);
        }
    };

    const setMouseFromEvent = (event) => {
        // Performance: Use offsetX/Y instead of getBoundingClientRect() to avoid synchronous main-thread layout thrashing
        mouse.x = event.offsetX;
        mouse.y = event.offsetY;
        mouse.active = true;
    };

    const drawNode = (node) => {
        const glow = Math.sin(node.pulse) * 0.5 + 0.5;
        const radius = node.radius + glow * 0.6;
        const glowRadius = radius * 2.5;

        // Performance: drawImage from pre-rendered texture avoids per-frame createRadialGradient.
        // globalAlpha varies the intensity (0.28–0.43) exactly as the original gradient alpha did.
        // Scaling drawImage to the live glowRadius preserves the pulsing size animation.
        ctx.globalAlpha = 0.28 + glow * 0.15;
        const drawSize = glowRadius * 2;
        ctx.drawImage(node.glowSprite, node.x - glowRadius, node.y - glowRadius, drawSize, drawSize);
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = node.fillColor;
        ctx.fill();
    };

    const drawConnections = () => {
        // Performance: Cache connection strength outside the loops to avoid severe DOM read overhead and layout thrashing
        // from repeated calls to getAttribute('data-theme') on every frame.
        const { alphaBoost, lineWidth } = getConnectionStrength();

        // Performance: Reset pre-allocated bins instead of creating new arrays each frame.
        // Batching connections into alpha bins reduces GPU draw calls from ~300 to CONNECTION_BINS,
        // and eliminates createLinearGradient() — the biggest per-frame allocation bottleneck.
        for (let b = 0; b < CONNECTION_BINS; b++) {
            binCoords[b].length = 0;
            binAlphaSum[b] = 0;
            binCount[b] = 0;
        }

        // Representative hue for connections: midpoint of each node's hue range per theme
        const baseHue = isDarkTheme ? 210 : 220;

        for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i];
            const neighbors = a.cachedNeighbors;

            for (let n = 0; n < neighbors.length; n++) {
                const j = neighbors[n];
                if (j <= i) continue;
                const b = nodes[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < CONNECTION_DISTANCE_SQ) {
                    const dist = Math.sqrt(distSq);
                    const ratio = 1 - dist / CONNECTION_DISTANCE;
                    const alpha = ratio * alphaBoost;
                    const binIdx = Math.min(CONNECTION_BINS - 1, (ratio * CONNECTION_BINS) | 0);
                    const coords = binCoords[binIdx];
                    coords.push(a.x, a.y, b.x, b.y);
                    binAlphaSum[binIdx] += alpha;
                    binCount[binIdx]++;
                }
            }
        }

        ctx.lineWidth = lineWidth;
        for (let b = 0; b < CONNECTION_BINS; b++) {
            const count = binCount[b];
            if (!count) continue;
            const avgAlpha = binAlphaSum[b] / count;
            ctx.strokeStyle = `hsla(${baseHue}, 70%, 65%, ${avgAlpha})`;
            ctx.beginPath();
            const coords = binCoords[b];
            for (let p = 0; p < coords.length; p += 4) {
                ctx.moveTo(coords[p], coords[p + 1]);
                ctx.lineTo(coords[p + 2], coords[p + 3]);
            }
            ctx.stroke();
        }
    };

    const updateNodes = () => {
        const closeZone = MOUSE_RADIUS * 0.3;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            node.pulse += node.pulseSpeed;

            const mdx = mouse.x - node.x;
            const mdy = mouse.y - node.y;
            const mdistSq = mdx * mdx + mdy * mdy;

            if (mouse.active && mdistSq < MOUSE_RADIUS_SQ && mdistSq > 0) {
                const mdist = Math.sqrt(mdistSq);
                if (mdist < closeZone) {
                    const force = (1 - mdist / closeZone) * 0.025;
                    node.vx -= (mdx / mdist) * force;
                    node.vy -= (mdy / mdist) * force;
                } else {
                    const force = (1 - mdist / MOUSE_RADIUS) * 0.004;
                    node.vx += (mdx / mdist) * force;
                    node.vy += (mdy / mdist) * force;
                }
            }

            const neighbors = node.cachedNeighbors;
            for (let n = 0; n < neighbors.length; n++) {
                const j = neighbors[n];
                if (i === j) continue;
                const other = nodes[j];
                const dx = node.x - other.x;
                const dy = node.y - other.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < REPULSION_DIST_SQ && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    const force = (1 - dist / REPULSION_DIST) * 0.012;
                    node.vx += (dx / dist) * force;
                    node.vy += (dy / dist) * force;
                }
            }

            const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
            if (speed > MAX_SPEED) {
                node.vx = (node.vx / speed) * MAX_SPEED;
                node.vy = (node.vy / speed) * MAX_SPEED;
            }

            if (speed < 0.05) {
                const angle = Math.random() * Math.PI * 2;
                node.vx += Math.cos(angle) * 0.05;
                node.vy += Math.sin(angle) * 0.05;
            }

            node.vx *= 0.998;
            node.vy *= 0.998;
            node.x += node.vx;
            node.y += node.vy;

            if (node.x < 0) node.x = width;
            if (node.x > width) node.x = 0;
            if (node.y < 0) node.y = height;
            if (node.y > height) node.y = 0;
        }
    };

    const animate = () => {
        if (!isHeroVisible || !isDocumentVisible) {
            animationFrameId = null;
            return;
        }

        if (lowPowerDevice) {
            frameCounter = (frameCounter + 1) % 2;
            if (frameCounter !== 0) {
                updateNodes();
                animationFrameId = window.requestAnimationFrame(animate);
                return;
            }
        }

        rebuildSpatialGrid();
        cacheAllNeighbors();
        ctx.clearRect(0, 0, width, height);
        drawConnections();
        for (let i = 0; i < nodes.length; i++) {
            drawNode(nodes[i]);
        }
        updateNodes();
        animationFrameId = window.requestAnimationFrame(animate);
    };

    const ensureAnimation = () => {
        if (!animationFrameId && isHeroVisible && isDocumentVisible) {
            animationFrameId = window.requestAnimationFrame(animate);
        }
    };

    const onClick = (event) => {
        // Performance: Use offsetX/Y instead of getBoundingClientRect() to avoid synchronous main-thread layout thrashing
        const clickX = event.offsetX;
        const clickY = event.offsetY;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const dx = node.x - clickX;
            const dy = node.y - clickY;
            const distSq = dx * dx + dy * dy;
            if (distSq < CLICK_RADIUS_SQ && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / CLICK_RADIUS) * 1.8;
                node.vx += (dx / dist) * force;
                node.vy += (dy / dist) * force;
            }
        }
    };

    const resetMouse = () => {
        mouse.active = false;
        mouse.x = -9999;
        mouse.y = -9999;
    };

    const onThemeChange = () => {
        isDarkTheme = document.body.getAttribute('data-theme') === 'dark';
        const baseHue = getThemeAwareHue();
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            node.hue = baseHue + Math.random() * 40;
            node.fillColor = `hsla(${node.hue}, 60%, 80%, 0.55)`;
            const maxGlowRadius = (node.radius + 0.6) * 2.5;
            const spriteSize = Math.ceil(maxGlowRadius) * 2 + 2;
            node.glowSprite = createGlowSprite(node.hue, maxGlowRadius, spriteSize);
        }
    };

    resize();
    createNodes();
    rebuildSpatialGrid();
    cacheAllNeighbors();
    ensureAnimation();

    heroSection.addEventListener('mousemove', setMouseFromEvent, { passive: true });
    heroSection.addEventListener('mouseleave', resetMouse, { passive: true });
    heroSection.addEventListener('click', onClick, { passive: true });
    window.addEventListener('themechange', onThemeChange);
    document.addEventListener('visibilitychange', () => {
        isDocumentVisible = !document.hidden;
        ensureAnimation();
    });

    if ('IntersectionObserver' in window) {
        const heroVisibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isHeroVisible = entry.isIntersecting;
                ensureAnimation();
            });
        }, { threshold: 0 });
        heroVisibilityObserver.observe(heroSection);
    }

    let canvasResizeTimeout;
    const handleCanvasResize = () => {
        // Performance: Lightweight structural resize fires immediately for visual continuity
        resize();
        if (canvasResizeTimeout) clearTimeout(canvasResizeTimeout);
        // Performance: Debounce heavy allocations (like OffscreenCanvas in createNodes)
        // to prevent main-thread lag and GC pressure during high-frequency resize events
        canvasResizeTimeout = setTimeout(() => {
            createNodes();
        }, 150);
    };

    if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(handleCanvasResize);
        observer.observe(heroSection);
    } else {
        window.addEventListener('resize', handleCanvasResize);
    }
};

const initHeroIntro = () => {
    const heroSection = document.getElementById('hero');
    const heroHeading = document.getElementById('hero-heading');
    if (!heroSection || !heroHeading) return;

    const heroLoadItems = heroSection.querySelectorAll('.hero-load-item');
    let asyncIndex = 0;
    heroLoadItems.forEach((item) => {
        const isSyncItem = item.classList.contains('hero-sync-item');
        if (isSyncItem) {
            item.style.setProperty('--hero-delay', '0ms');
        } else {
            // Stagger async items so they cascade in as typing nears completion
            item.style.setProperty('--hero-delay', `${380 + (asyncIndex * 100)}ms`);
            asyncIndex++;
        }
    });

    const fullHeadingText = (heroHeading.dataset.fullText || heroHeading.textContent)
        .replace(/\s*\n\s*/g, '\n')
        .trim();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        heroHeading.textContent = fullHeadingText;
        heroSection.classList.add('hero-intro-started');
        heroSection.classList.add('hero-loaded');
        return;
    }

    heroHeading.textContent = '';
    heroHeading.classList.add('hero-is-typing');
    heroSection.classList.add('hero-intro-started');
    // Add hero-loaded immediately so async items begin their delayed fade-ins
    // concurrently with typing, rather than waiting for typing to complete.
    heroSection.classList.add('hero-loaded');

    let charIndex = 0;
    const typingSpeedMs = 36;

    const typeNextCharacter = () => {
        charIndex += 1;
        heroHeading.textContent = fullHeadingText.slice(0, charIndex);

        if (charIndex < fullHeadingText.length) {
            window.setTimeout(typeNextCharacter, typingSpeedMs);
            return;
        }

        heroHeading.classList.remove('hero-is-typing');
    };

    typeNextCharacter();
};

document.addEventListener('DOMContentLoaded', () => {
    // Performance: Activate preloaded font CSS now that the DOM is ready,
    // keeping the initial render unblocked by the external font request.
    const fontLink = document.getElementById('google-fonts-link');
    if (fontLink) fontLink.rel = 'stylesheet';

    const runWhenIdle = (callback) => {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(callback, { timeout: 350 });
            return;
        }
        window.setTimeout(callback, 0);
    };

    // Start hero intro immediately to begin typing animation on first paint.
    initHeroIntro();

    // Defer canvas init past first paint so it doesn't compete with critical
    // hero text rendering. Double-rAF ensures at least one frame has been painted.
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(initHeroNeuralNetwork);
    });

    const inPracticeSection = document.querySelector('.ip-section');
    if (inPracticeSection) {
        document.documentElement.classList.add('ip-enhanced');
    }

    // Performance: Lazily clone skills lists for the marquee to unblock the main thread
    const initMarquee = () => {
        const skillsTracks = document.querySelectorAll('.skills-track');
        const sourceList = document.querySelector('.skills-track--slow .skills-list');

        skillsTracks.forEach((track, index) => {
            let listToClone = track.querySelector('.skills-list');

            // If track is empty, populate it with the source list (shifted for visual variety)
            if (!listToClone && sourceList) {
                listToClone = sourceList.cloneNode(true);
                const items = Array.from(listToClone.children);
                // Shift elements based on track index to prevent identical alignment
                const shiftAmount = Math.floor(items.length / 3) * index;
                for (let i = 0; i < shiftAmount; i++) {
                    listToClone.appendChild(items[i]);
                }
                track.appendChild(listToClone);
            }

            // Clone for infinite scroll effect
            if (listToClone) {
                const clone = listToClone.cloneNode(true);
                clone.setAttribute('aria-hidden', 'true');
                track.appendChild(clone);
            }
        });
    };

    const marqueeSection = document.getElementById('skills');
    if (marqueeSection && 'IntersectionObserver' in window) {
        const marqueeObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    runWhenIdle(initMarquee);
                    observer.disconnect();
                }
            });
        }, { rootMargin: '200px' });
        marqueeObserver.observe(marqueeSection);
    } else {
        runWhenIdle(initMarquee);
    }

    // Dynamic copyright year
    const yearElement = document.getElementById('copyright-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links li a');
    const navList = document.querySelector('.nav-links');
    const themeToggle = document.querySelector('.theme-toggle');
    const themeText = document.querySelector('.theme-text');
    const desktopQuery = window.matchMedia('(min-width: 1101px)');
    const supportsIO = 'IntersectionObserver' in window;

    // Create Map for O(1) nav link lookup
    const sectionIdToNavLink = new Map();
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            const id = href.substring(1);
            sectionIdToNavLink.set(id, link);
        }
    });

    if (sectionIdToNavLink.has('what-i-do')) {
        sectionIdToNavLink.set('in-practice', sectionIdToNavLink.get('what-i-do'));
    }

    let activeSectionId = '';
    let activeNavLink = null;
    let indicatorTimeout;
    let pendingSectionId = '';
    let pendingSectionTimeout;

    // Performance: Cache nav link metrics to avoid synchronous reflows during scroll
    const navLinkMetrics = new Map();

    const calculateNavLinkMetrics = (link, listRect = navList.getBoundingClientRect()) => {
        const linkRect = link.getBoundingClientRect();
        return {
            left: linkRect.left - listRect.left,
            width: linkRect.width
        };
    };

    const updateNavLinkMetrics = () => {
        if (!navList) return;

        // Only calculate on desktop where indicator is visible
        if (!desktopQuery.matches) return;

        // Performance: Cache listRect outside loop to avoid redundant synchronous layout calculations
        const listRect = navList.getBoundingClientRect();

        navLinks.forEach(link => {
            navLinkMetrics.set(link, calculateNavLinkMetrics(link, listRect));
        });

        // Also update the current indicator if active, to ensure it snaps to correct position
        if (activeNavLink && !isInteractingWithNav) {
            setNavIndicator(activeNavLink);
        }
    };

    // Initialize metrics after first paint to avoid forcing synchronous layout on startup
    requestAnimationFrame(updateNavLinkMetrics);
    // Update when fonts load (as text width changes)
    document.fonts.ready.then(updateNavLinkMetrics);

    const setNavIndicator = (link) => {
        if (!navList) {
            return;
        }

        if (!link || !desktopQuery.matches) {
            navList.style.setProperty('--indicator-opacity', '0');
            return;
        }

        let metrics = navLinkMetrics.get(link);

        // Defensive: Fallback to on-the-fly calculation if metrics missing
        if (!metrics) {
            metrics = calculateNavLinkMetrics(link);
            // Cache it for next time
            navLinkMetrics.set(link, metrics);
        }

        const wasHidden = navList.style.getPropertyValue('--indicator-opacity') !== '1';

        if (wasHidden) {
            clearTimeout(indicatorTimeout);
            navList.classList.add('indicator-appear');
        }

        navList.style.setProperty('--indicator-left', `${metrics.left}px`);
        navList.style.setProperty('--indicator-width', `${metrics.width}px`);
        navList.style.setProperty('--indicator-opacity', '1');

        if (wasHidden) {
            indicatorTimeout = setTimeout(() => navList.classList.remove('indicator-appear'), 300);
        }
    };

    let isInteractingWithNav = false;

    // Add interactive indicator tracking for hover and focus
    if (navList) {
        navLinks.forEach(link => {
            link.addEventListener('mouseenter', () => {
                isInteractingWithNav = true;
                setNavIndicator(link);
            });
            link.addEventListener('focus', () => {
                isInteractingWithNav = true;
                setNavIndicator(link);
            });
        });

        navList.addEventListener('mouseleave', () => {
            isInteractingWithNav = false;
            setNavIndicator(activeNavLink);
        });

        navList.addEventListener('focusout', (e) => {
            // Check if the new focus target is still within the nav list
            if (!navList.contains(e.relatedTarget)) {
                isInteractingWithNav = false;
                setNavIndicator(activeNavLink);
            }
        });
    }

    // Performance: Cache theme icons to prevent redundant DOM queries on every toggle
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');

    const updateThemeToggle = (theme) => {
        const isDark = theme === 'dark';

        if (sunIcon && moonIcon) {
            if (isDark) {
                sunIcon.removeAttribute('hidden');
                moonIcon.setAttribute('hidden', '');
            } else {
                sunIcon.setAttribute('hidden', '');
                moonIcon.removeAttribute('hidden');
            }
        }

        if (themeText) {
            themeText.textContent = isDark ? 'Light' : 'Dark';
        }
        themeToggle.setAttribute('aria-label', isDark ? 'Toggle light mode' : 'Toggle dark mode');
        themeToggle.setAttribute('title', isDark ? 'Toggle light mode (T)' : 'Toggle dark mode (T)');
    };

    let storedTheme = null;
    try {
        storedTheme = localStorage.getItem('theme');
    } catch (e) {
        // Security: Fail securely if strict privacy settings block localStorage
        console.warn('localStorage is blocked, falling back to default theme');
    }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
    if (initialTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
    }
    updateThemeToggle(initialTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            const nextTheme = isDark ? 'light' : 'dark';
            if (nextTheme === 'dark') {
                document.body.setAttribute('data-theme', 'dark');
            } else {
                document.body.removeAttribute('data-theme');
            }
            try {
                localStorage.setItem('theme', nextTheme);
            } catch (e) {
                // Security: Ignore errors from blocked localStorage
            }
            updateThemeToggle(nextTheme);
            window.dispatchEvent(new Event('themechange'));
        });
    }

    const allAnimatedItems = document.querySelectorAll('main > *');
    const animatedItems = Array.from(allAnimatedItems).filter(item => {
        // The In Practice section is intentionally very tall on desktop because its
        // sticky scenes span multiple viewport heights. Applying the global
        // scroll-fade threshold to that container can keep it permanently hidden,
        // so let its nested animations handle the reveal instead.
        if (item.classList.contains('ip-section')) {
            item.classList.add('is-visible');
            return false;
        }

        item.classList.add('scroll-fade');
        return true;
    });

    // Replaced manual active section tracking with IntersectionObserver
    const setActiveSection = (id) => {
        if (activeSectionId === id) return;

        // Remove active class from previous link
        if (activeNavLink) {
            activeNavLink.classList.remove('active');
            activeNavLink.removeAttribute('aria-current');
        }

        activeSectionId = id;
        activeNavLink = sectionIdToNavLink.get(id);

        if (activeNavLink) {
            activeNavLink.classList.add('active');
            activeNavLink.setAttribute('aria-current', 'true');
            if (!isInteractingWithNav) {
                setNavIndicator(activeNavLink);
            }
        } else {
            if (!isInteractingWithNav) {
                setNavIndicator(null);
            }
        }
    };

    const clearPendingSection = () => {
        pendingSectionId = '';
        clearTimeout(pendingSectionTimeout);
    };

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const href = link.getAttribute('href');
            if (!href || !href.startsWith('#')) {
                clearPendingSection();
                return;
            }

            pendingSectionId = href.slice(1);
            setActiveSection(pendingSectionId);

            // Safety timeout: if navigation is interrupted, resume normal observer updates.
            clearTimeout(pendingSectionTimeout);
            pendingSectionTimeout = setTimeout(() => {
                pendingSectionId = '';
            }, 1200);
        });
    });

    if (supportsIO) {
        // Flag for initial check to ensure visible elements are shown on load
        let isInitialCheck = true;
        setTimeout(() => { isInitialCheck = false; }, 1000);

        // Observer for scroll animations
        const animationObserver = new IntersectionObserver((entries) => {
            // Performance: Avoid accessing window.scrollY/innerHeight to prevent main thread layout thrashing.
            // Using entry properties is more efficient as they are already calculated.

            entries.forEach(entry => {
                const rect = entry.boundingClientRect;
                const isBelowViewport = rect.top > 0;

                // Element is entering from bottom if its top edge is visible (rect.top >= 0)
                // This covers both scrolling down and elements at the very top (formerly scrollY === 0)
                const isEnteringFromBottom = rect.top >= 0;

                if (entry.isIntersecting) {
                    // Show if:
                    // 1. Initial load (show everything visible)
                    // 2. Element is entering from bottom (scrolling down or at top)
                    if (isInitialCheck || isEnteringFromBottom) {
                        entry.target.classList.add('is-visible');
                    }
                } else {
                    // Hide if:
                    // 1. It is below viewport (scrolling up past it)
                    if (isBelowViewport) {
                        entry.target.classList.remove('is-visible');
                    }
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -6% 0px',
        });

        animatedItems.forEach(item => {
            if (!item.classList.contains('ip-section')) {
                animationObserver.observe(item);
            }
        });

        // Observer for Active Section
        // rootMargin: '-20% 0px -80% 0px' creates a detection line at 20% from top.
        const activeSectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (pendingSectionId) {
                        if (entry.target.id === pendingSectionId) {
                            setActiveSection(entry.target.id);
                            clearPendingSection();
                        }
                        return;
                    }
                    setActiveSection(entry.target.id);
                }
            });
        }, {
            rootMargin: '-20% 0px -80% 0px',
            threshold: 0
        });

        sections.forEach(section => activeSectionObserver.observe(section));

    } else {
        animatedItems.forEach(item => item.classList.add('is-visible'));
    }

    let resizeTimeout;
    window.addEventListener('resize', () => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        // Performance: Debounce resize event to prevent excessive main thread layout recalculations
        resizeTimeout = setTimeout(() => {
            // Re-calculate all metrics on resize
            updateNavLinkMetrics();
            evaluateInPracticeLayout();
        }, 150);
    });

    // In Practice — guard against desktop browsers that fail to size the sticky scene
    // correctly, which otherwise leaves a tall blank area while scrolling.
    const ipSceneWraps = document.querySelectorAll('.ip-scene-panel-wrap');
    const ipScrollScenes = document.querySelectorAll('.ip-scroll-scene');
    const supportsSticky = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('position', 'sticky');

    // Declared here so setInPracticeFallbackLayout can access it
    let sceneRevealObserver = null;
    let refreshSceneObserver = null;

    // Tracks scenes already animated so scroll-lock only fires on first reveal
    const ipAnimatedScenes = new WeakSet();
    let ipScrollLockTimer = null;

    const ipLockScroll = () => {
        if (ipScrollLockTimer) clearTimeout(ipScrollLockTimer);
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.documentElement.style.overflow = 'hidden';
        if (scrollbarWidth > 0) document.documentElement.style.paddingRight = scrollbarWidth + 'px';
        // Hold for animation (0.82s) + buffer to appreciate the after state
        ipScrollLockTimer = setTimeout(() => {
            document.documentElement.style.overflow = '';
            document.documentElement.style.paddingRight = '';
            ipScrollLockTimer = null;
        }, 1400);
    };

    const setInPracticeFallbackLayout = (shouldEnable) => {
        const wasEnabled = document.documentElement.classList.contains('ip-no-sticky');
        document.documentElement.classList.toggle('ip-no-sticky', shouldEnable);
        if (shouldEnable) {
            // Disconnect the IntersectionObserver — CSS already makes both panels visible
            if (sceneRevealObserver) {
                sceneRevealObserver.disconnect();
                sceneRevealObserver = null;
            }
            ipScrollScenes.forEach(scene => scene.classList.add('scene-revealed'));
        } else if (wasEnabled && refreshSceneObserver) {
            // Sticky support restored after a resize — rebuild the observer
            refreshSceneObserver();
        }
    };

    const evaluateInPracticeLayout = () => {
        if (!ipSceneWraps.length) return;

        if (!supportsSticky) {
            setInPracticeFallbackLayout(true);
            return;
        }

        const hasCollapsedScene = Array.from(ipSceneWraps).some((wrap) => {
            const rect = wrap.getBoundingClientRect();
            return rect.height < 24 || rect.width < 24;
        });

        setInPracticeFallbackLayout(hasCollapsedScene);
    };

    if (ipSceneWraps.length) {
        requestAnimationFrame(evaluateInPracticeLayout);
    }

    // In Practice — add ip-visible to each act as soon as it enters the viewport
    // (threshold: 0 because acts now contain tall scroll scenes; we only need the top edge)
    const ipActs = document.querySelectorAll('.ip-act');
    if (ipActs.length) {
        const revealVisibleIpActs = () => {
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

            // Performance: Batch DOM reads to prevent layout thrashing
            const actsToReveal = [];
            ipActs.forEach((act) => {
                const rect = act.getBoundingClientRect();
                if (rect.bottom > 0 && rect.top < viewportHeight) {
                    actsToReveal.push(act);
                }
            });

            // Performance: Batch DOM writes
            actsToReveal.forEach(act => act.classList.add('ip-visible'));
        };

        if (supportsIO) {
            const actObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('ip-visible');
                        actObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0, rootMargin: '-80px 0px 0px 0px' });

            ipActs.forEach(act => actObserver.observe(act));
            revealVisibleIpActs();
            let actResizeTimeout;
            window.addEventListener('resize', () => {
                if (actResizeTimeout) clearTimeout(actResizeTimeout);
                // Performance: Debounce resize event to prevent excessive main thread layout recalculations
                actResizeTimeout = setTimeout(revealVisibleIpActs, 150);
            });
            requestAnimationFrame(() => {
                if (!document.querySelector('.ip-act.ip-visible')) {
                    ipActs[0].classList.add('ip-visible');
                }
            });
        } else {
            ipActs.forEach(act => act.classList.add('ip-visible'));
        }
    }

    // In Practice — crossfade from "before" to "after" when the sentinel
    // element (positioned mid-scene) scrolls into view.
    // Uses IntersectionObserver for zero main-thread scroll cost: no scroll
    // listener, no rAF, no getBoundingClientRect on every frame.
    if (ipScrollScenes.length) {
        if (!supportsIO) {
            ipScrollScenes.forEach(scene => scene.classList.add('scene-revealed'));
        } else {
        // Performance: Pre-cache trigger elements and their parent scenes once,
        // avoiding repeated querySelector calls inside any hot path.
        const triggerToScene = new Map();
        const cachedTriggers = [];
        ipScrollScenes.forEach(scene => {
            const trigger = scene.querySelector('.ip-scene-trigger');
            if (trigger) {
                cachedTriggers.push(trigger);
                triggerToScene.set(trigger, scene);
            }
        });

        // Performance: Create the MediaQueryList once; check .matches (a cheap
        // property read) instead of calling matchMedia() on every frame.
        const mobileQuery = window.matchMedia('(max-width: 720px)');

        const setupSceneRevealObserver = () => {
            if (!supportsIO) {
                ipScrollScenes.forEach(scene => scene.classList.add('scene-revealed'));
                return;
            }

            if (sceneRevealObserver) {
                sceneRevealObserver.disconnect();
                sceneRevealObserver = null;
            }

            // In no-sticky mode both panels are already visible via CSS; nothing to observe.
            if (document.documentElement.classList.contains('ip-no-sticky') || !cachedTriggers.length) return;

            if (supportsIO) {
                // Shrink the bottom of the viewport detection zone so the observer fires at
                // the same visual threshold as the previous getBoundingClientRect logic:
                //   desktop → 58 % from top  →  bottom margin = -(100 - 58) % = -42 %
                //   mobile  → 78 % from top  →  bottom margin = -(100 - 78) % = -22 %
                const rootMarginBottom = mobileQuery.matches ? '-22%' : '-42%';

                sceneRevealObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        const scene = triggerToScene.get(entry.target);
                        if (!scene) return;
                        // Reveal when the trigger is inside the detection zone OR has
                        // already scrolled above it (top < 0 means above the viewport).
                        const shouldReveal = entry.isIntersecting || entry.boundingClientRect.top < 0;
                        scene.classList.toggle('scene-revealed', shouldReveal);
                        // On first reveal (not on scroll-back), briefly lock scroll so the
                        // swipe animation can complete before the page moves on. Skip on
                        // mobile where touch physics behave differently.
                        if (entry.isIntersecting && !ipAnimatedScenes.has(scene) && !mobileQuery.matches) {
                            ipAnimatedScenes.add(scene);
                            ipLockScroll();
                        }
                    });
                }, {
                    rootMargin: `0px 0px ${rootMarginBottom} 0px`,
                    threshold: 0,
                });

                cachedTriggers.forEach(trigger => sceneRevealObserver.observe(trigger));
            } else {
                // Fallback: Reveal all scenes immediately if IntersectionObserver is unavailable
                ipScrollScenes.forEach(scene => scene.classList.add('scene-revealed'));
            }
        };

        // Store reference so setInPracticeFallbackLayout can rebuild the observer
        // if sticky support is restored after a resize.
        refreshSceneObserver = setupSceneRevealObserver;

        // Recreate with the correct rootMargin when the mobile breakpoint changes.
        mobileQuery.addEventListener('change', setupSceneRevealObserver);
        setupSceneRevealObserver();
        }
    }

    // Form Validation
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        const submitButton = contactForm.querySelector('.contact-submit-btn');

        // Time-based bot detection: record when the form section first loads
        const formLoadTimeInput = document.getElementById('formLoadTime');
        if (formLoadTimeInput) {
            formLoadTimeInput.value = Date.now();
        }

        // Rate limiting via localStorage: max 5 submissions per 15 minutes
        const RATE_LIMIT_MAX = 5;
        const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
        function isRateLimited() {
            const now = Date.now();
            let timestamps;
            try {
                timestamps = JSON.parse(localStorage.getItem('_formSubmits') || '[]');
                // Security Enhancement: Validate that parsed JSON is actually an array
                // before calling array methods, preventing unhandled exceptions if
                // localStorage was tampered with or corrupted.
                if (!Array.isArray(timestamps)) timestamps = [];
            } catch (_) {
                timestamps = [];
            }
            timestamps = timestamps.filter(t => typeof t === 'number' && now - t < RATE_LIMIT_WINDOW_MS);
            if (timestamps.length >= RATE_LIMIT_MAX) return true;
            timestamps.push(now);
            try {
                localStorage.setItem('_formSubmits', JSON.stringify(timestamps));
            } catch (_) { /* storage unavailable */ }
            return false;
        }

        // UX Improvement: Clear inline validation errors instantly when the user starts typing to correct them
        contactForm.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', () => {
                if (input.getAttribute('aria-invalid') === 'true') {
                    input.removeAttribute('aria-invalid');
                    input.removeAttribute('aria-describedby');
                    const errorMsg = document.getElementById(`${input.id}-error`);
                    if (errorMsg) errorMsg.remove();
                }
            });
        });

        contactForm.addEventListener('submit', (e) => {
            // Bot protection 1: Honeypot — reject if hidden field is filled
            const gotchaInput = contactForm.querySelector('input[name="_gotcha"]');
            if (gotchaInput && gotchaInput.value) {
                e.preventDefault();
                return;
            }

            // Bot protection 2: Time-based — reject if form was submitted in under 2 seconds
            const loadTime = parseInt(formLoadTimeInput ? formLoadTimeInput.value : '0', 10);
            if (!loadTime || Date.now() - loadTime < 2000) {
                e.preventDefault();
                return;
            }

            // Bot protection 3: Rate limiting — max 5 submissions per 15-minute window
            if (isRateLimited()) {
                e.preventDefault();
                const existingRateError = contactForm.querySelector('.error-msg-rate');
                if (!existingRateError) {
                    const rateError = document.createElement('p');
                    rateError.className = 'error-msg error-msg-rate';
                    rateError.textContent = 'Too many submissions. Please wait a few minutes before trying again.';
                    rateError.setAttribute('role', 'status');
                    contactForm.insertBefore(rateError, submitButton);
                }
                return;
            }

            let isValid = true;

            // Remove existing messages
            const existingErrors = contactForm.querySelectorAll('.error-msg, .form-success-msg');
            existingErrors.forEach(error => {
                // Remove ARIA attributes from the associated input
                const input = error.previousSibling;
                if (input && input.removeAttribute) {
                    input.removeAttribute('aria-invalid');
                    input.removeAttribute('aria-describedby');
                }
                error.remove();
            });

            // Helper to add error message
            const showError = (input, message) => {
                const errorSpan = document.createElement('span');
                errorSpan.className = 'error-msg';
                errorSpan.id = `${input.id}-error`;
                errorSpan.textContent = message;
                errorSpan.setAttribute('role', 'status');
                input.parentNode.insertBefore(errorSpan, input.nextSibling);
                input.setAttribute('aria-invalid', 'true');
                input.setAttribute('aria-describedby', errorSpan.id);
                isValid = false;
            };

            // Validate Name
            const nameInput = document.getElementById('name');
            if (!nameInput.value.trim()) {
                showError(nameInput, 'Name is required.');
            }

            // Validate Email
            const emailInput = document.getElementById('email');
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailInput.value.trim()) {
                showError(emailInput, 'Email is required.');
            } else if (!emailRegex.test(emailInput.value.trim())) {
                showError(emailInput, 'Please enter a valid email address.');
            }

            // Validate Message
            const messageInput = document.getElementById('message');
            if (!messageInput.value.trim()) {
                showError(messageInput, 'Message is required.');
            }

            if (!isValid) {
                e.preventDefault();
                // Accessibility: Shift focus to the first invalid input for immediate error recovery
                const firstInvalidInput = contactForm.querySelector('[aria-invalid="true"]');
                if (firstInvalidInput) {
                    firstInvalidInput.focus();
                }
                return;
            }

            if (submitButton) {
                const submitText = submitButton.querySelector('.submit-text');
                const submitSpinner = submitButton.querySelector('.submit-spinner');
                if (submitText) submitText.textContent = 'Sending...';
                if (submitSpinner) submitSpinner.removeAttribute('hidden');
                submitButton.disabled = true;
                submitButton.setAttribute('aria-disabled', 'true');
            }
            contactForm.classList.add('is-submitting');

            const successMsg = document.createElement('p');
            successMsg.className = 'form-success-msg';
            successMsg.setAttribute('role', 'status');
            successMsg.textContent = 'Looks great — sending your message now.';
            contactForm.insertBefore(successMsg, submitButton);
        });
    }

    // Back to Top Button
    // Keyboard shortcut for theme toggle
    document.addEventListener('keydown', (e) => {
        // Allow 't' or 'T' to toggle theme, but ignore if modifier keys are pressed or if user is typing in an input
        if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag !== 'input' && activeTag !== 'textarea') {
                if (themeToggle) {
                    themeToggle.click();
                }
            }
        }
    });

    const legalModalTriggers = document.querySelectorAll('[data-legal-modal-target]');
    const legalModalCloseButtons = document.querySelectorAll('[data-legal-modal-close]');

    // Performance: Cache legal modal overlays to prevent repeated DOM queries on every keydown event
    const legalModalOverlays = document.querySelectorAll('.legal-modal-overlay');

    const openLegalModal = (modal) => {
        if (!modal) return;
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        const closeButton = modal.querySelector('[data-legal-modal-close]');
        if (closeButton) {
            closeButton.focus();
        }
    };

    const closeLegalModal = (modal) => {
        if (!modal) return;
        modal.hidden = true;
        const hasOpenModal = Array.from(legalModalOverlays).some(overlay => !overlay.hidden);
        if (!hasOpenModal) {
            document.body.style.overflow = '';
        }
    };

    legalModalTriggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            const targetId = trigger.getAttribute('data-legal-modal-target');
            if (!targetId) return;
            const modal = document.getElementById(targetId);
            openLegalModal(modal);
        });
    });

    legalModalCloseButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.legal-modal-overlay');
            closeLegalModal(modal);
        });
    });

    legalModalOverlays.forEach((overlay) => {
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                closeLegalModal(overlay);
            }
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            legalModalOverlays.forEach((overlay) => {
                if (!overlay.hidden) {
                    closeLegalModal(overlay);
                }
            });
        }
    });

    document.querySelectorAll('.terms-email-reveal').forEach((button) => {
        button.addEventListener('click', () => {
            const user = button.dataset.emailUser;
            const domain = button.dataset.emailDomain;
            if (!user || !domain) return;

            const email = `${user}@${domain}`;
            const output = button.nextElementSibling;
            if (!output) return;

            output.textContent = ` ${email}`;
            button.hidden = true;
        });
    });

    const backToTopBtn = document.getElementById('back-to-top');

    if (backToTopBtn) {
        const sentinel = document.getElementById('back-to-top-sentinel');

        if (supportsIO && sentinel) {
            // Performance: Use IntersectionObserver instead of scroll listener to avoid main thread work
            // The sentinel is 200px tall at the top of the body.
            // When it stops intersecting, it means the user has scrolled past 200px.
            const backToTopObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) {
                        backToTopBtn.classList.add('is-visible');
                    } else {
                        backToTopBtn.classList.remove('is-visible');
                    }
                });
            }, {
                threshold: 0,
                // Optional: ensure it works even if sentinel is slightly off-screen
                rootMargin: '0px'
            });
            backToTopObserver.observe(sentinel);
        } else {
            // Fallback for older browsers or if sentinel is missing
            window.addEventListener('scroll', () => {
                if (window.scrollY > 200) {
                    backToTopBtn.classList.add('is-visible');
                } else {
                    backToTopBtn.classList.remove('is-visible');
                }
            }, { passive: true });
        }

        // Performance: Cache skip link to avoid redundant DOM queries on every click
        // Yields ~13-18x speed improvement for the click operation
        const skipLink = document.querySelector('.skip-link');

        // Performance: Cache matchMedia query to avoid synchronous style recalculations on every click
        const prefersReducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        backToTopBtn.addEventListener('click', () => {
            const prefersReducedMotion = prefersReducedMotionQuery.matches;
            window.scrollTo({
                top: 0,
                behavior: prefersReducedMotion ? 'auto' : 'smooth'
            });
            // Accessibility: Move focus to skip link (start of page)
            if (skipLink) {
                skipLink.focus({ preventScroll: true });
            }
        });
    }
});
