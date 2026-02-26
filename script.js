document.addEventListener('DOMContentLoaded', () => {
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
    const themeIcon = document.querySelector('.theme-icon');
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

    let activeSectionId = '';
    let activeNavLink = null;
    let indicatorTimeout;

    // Performance: Cache nav link metrics to avoid synchronous reflows during scroll
    const navLinkMetrics = new Map();

    const updateNavLinkMetrics = () => {
        if (!navList) return;

        // Only calculate on desktop where indicator is visible
        if (!desktopQuery.matches) return;

        const listRect = navList.getBoundingClientRect();
        navLinks.forEach(link => {
            const linkRect = link.getBoundingClientRect();
            navLinkMetrics.set(link, {
                left: linkRect.left - listRect.left,
                width: linkRect.width
            });
        });

        // Also update the current indicator if active, to ensure it snaps to correct position
        if (activeNavLink) {
            setNavIndicator(activeNavLink);
        }
    };

    // Initialize metrics
    updateNavLinkMetrics();
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
            const linkRect = link.getBoundingClientRect();
            const listRect = navList.getBoundingClientRect();
            metrics = {
                left: linkRect.left - listRect.left,
                width: linkRect.width
            };
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

    const updateThemeToggle = (theme) => {
        const isDark = theme === 'dark';
        themeIcon.textContent = isDark ? '☀️' : '🌙';
        if (themeText) {
            themeText.textContent = isDark ? 'Light' : 'Dark';
        }
        themeToggle.setAttribute('aria-label', isDark ? 'Toggle light mode' : 'Toggle dark mode');
    };

    const triggerThemeSpin = () => {
        if (!themeIcon) {
            return;
        }

        themeIcon.classList.remove('is-spinning');
        void themeIcon.offsetWidth;
        themeIcon.classList.add('is-spinning');
        themeIcon.addEventListener('animationend', () => {
            themeIcon.classList.remove('is-spinning');
        }, { once: true });
    };

    const storedTheme = localStorage.getItem('theme');
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
            localStorage.setItem('theme', nextTheme);
            updateThemeToggle(nextTheme);
            triggerThemeSpin();
        });
    }

    const animatedItems = document.querySelectorAll('main > *');
    animatedItems.forEach(item => item.classList.add('scroll-fade'));

    // Replaced manual active section tracking with IntersectionObserver
    const setActiveSection = (id) => {
        if (activeSectionId === id) return;

        // Remove active class from previous link
        if (activeNavLink) {
            activeNavLink.classList.remove('active');
        }

        activeSectionId = id;
        activeNavLink = sectionIdToNavLink.get(id);

        if (activeNavLink) {
            activeNavLink.classList.add('active');
            setNavIndicator(activeNavLink);
        } else {
            setNavIndicator(null);
        }
    };

    if (supportsIO) {
        // Flag for initial check to ensure visible elements are shown on load
        let isInitialCheck = true;
        setTimeout(() => { isInitialCheck = false; }, 1000);

        // Observer for scroll animations
        const animationObserver = new IntersectionObserver((entries) => {
            // Performance: Avoid accessing window.scrollY/innerHeight to prevent main thread layout thrashing.
            // Using entry properties is more efficient as they are already calculated.

            entries.forEach(entry => {
                // Use rootBounds for viewport height (fallback to innerHeight if unavailable)
                const viewportHeight = entry.rootBounds?.height || window.innerHeight;
                const rect = entry.boundingClientRect;
                const isBelowViewport = rect.top >= viewportHeight;

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

        animatedItems.forEach(item => animationObserver.observe(item));

        // Observer for Active Section
        // rootMargin: '-20% 0px -80% 0px' creates a detection line at 20% from top.
        const activeSectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
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

    let resizeRaf;
    window.addEventListener('resize', () => {
        if (resizeRaf) cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => {
            // Re-calculate all metrics on resize
            updateNavLinkMetrics();
        });
    });

    // Back to Top Button
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

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            // Accessibility: Move focus to skip link (start of page)
            const skipLink = document.querySelector('.skip-link');
            if (skipLink) {
                skipLink.focus({ preventScroll: true });
            }
        });
    }
});
