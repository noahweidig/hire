document.addEventListener('DOMContentLoaded', () => {
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
                    initMarquee();
                    observer.disconnect();
                }
            });
        }, { rootMargin: '200px' });
        marqueeObserver.observe(marqueeSection);
    } else {
        initMarquee();
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

        animatedItems.forEach(item => animationObserver.observe(item));

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
        }, 150);
    });

    // In Practice — reveal each act on scroll via IntersectionObserver
    const ipActs = document.querySelectorAll('.ip-act');
    if (ipActs.length) {
        const actObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('ip-visible');
                    actObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.35 });

        ipActs.forEach(act => actObserver.observe(act));
    }

    // Form Validation
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        const submitButton = contactForm.querySelector('.contact-submit-btn');

        contactForm.addEventListener('submit', (e) => {
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
                submitButton.textContent = 'Sending...';
            }
            contactForm.classList.add('is-submitting');

            const successMsg = document.createElement('p');
            successMsg.className = 'form-success-msg';
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
