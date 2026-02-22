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

    const setNavIndicator = (link) => {
        if (!navList) {
            return;
        }

        if (!link || !desktopQuery.matches) {
            navList.style.setProperty('--indicator-opacity', '0');
            return;
        }

        const linkRect = link.getBoundingClientRect();
        const listRect = navList.getBoundingClientRect();
        const left = linkRect.left - listRect.left;
        const wasHidden = navList.style.getPropertyValue('--indicator-opacity') !== '1';

        if (wasHidden) {
            clearTimeout(indicatorTimeout);
            navList.classList.add('indicator-appear');
        }

        navList.style.setProperty('--indicator-left', `${left}px`);
        navList.style.setProperty('--indicator-width', `${linkRect.width}px`);
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

    const animatedItems = document.querySelectorAll('main > *, footer > *');
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
            // PERFORMANCE: Cache window properties to prevent layout thrashing in the loop
            const viewportHeight = window.innerHeight;
            const currentScrollY = window.scrollY;

            entries.forEach(entry => {
                const rect = entry.boundingClientRect;
                const isBelowViewport = rect.top >= viewportHeight;
                // Element is entering from bottom if its top edge is visible (or below viewport top)
                // We use rect.top > 0 to differentiate from entering from top (where rect.top < 0 usually)
                const isEnteringFromBottom = rect.top > 0;

                if (entry.isIntersecting) {
                    // Show if:
                    // 1. Initial load (show everything visible)
                    // 2. We are at the very top (scrollY=0)
                    // 3. Element is entering from bottom (scrolling down)
                    if (isInitialCheck || currentScrollY === 0 || isEnteringFromBottom) {
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
            // Re-calculate indicator position for current active link
            if (activeNavLink) {
                setNavIndicator(activeNavLink);
            }
        });
    });
});
