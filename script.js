document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links li a');
    const navList = document.querySelector('.nav-links');
    const themeToggle = document.querySelector('.theme-toggle');
    const themeIcon = document.querySelector('.theme-icon');
    const themeText = document.querySelector('.theme-text');
    const skillItems = document.querySelectorAll('.skills-list li');
    const desktopQuery = window.matchMedia('(min-width: 1101px)');
    const supportsIO = 'IntersectionObserver' in window;
    let sectionData = [];
    let activeSectionId = '';
    let lastScrollY = window.scrollY;
    let scrollingDown = true;
    let ticking = false;

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
        navList.style.setProperty('--indicator-left', `${left}px`);
        navList.style.setProperty('--indicator-width', `${linkRect.width}px`);
        navList.style.setProperty('--indicator-opacity', '1');
    };

    const updateThemeToggle = (theme) => {
        const isDark = theme === 'dark';
        themeIcon.textContent = isDark ? '☀️' : '🌙';
        if (themeText) {
            themeText.textContent = isDark ? 'Light' : 'Dark';
        }
        themeToggle.setAttribute('aria-label', isDark ? 'Toggle light mode' : 'Toggle dark mode');
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
        });
    }

    const animatedItems = document.querySelectorAll('main > *, footer > *');
    animatedItems.forEach(item => item.classList.add('scroll-fade'));
    skillItems.forEach(item => item.classList.add('scroll-slide'));

    const updateSectionMetrics = () => {
        sectionData = Array.from(sections, (section) => ({
            id: section.getAttribute('id'),
            top: section.offsetTop,
        }));
    };

    const updateActiveSection = () => {
        let current = '';
        const scrollY = lastScrollY;

        for (let i = 0; i < sectionData.length; i += 1) {
            if (scrollY >= (sectionData[i].top - 150)) {
                current = sectionData[i].id;
            }
        }

        if (current === activeSectionId) {
            return;
        }

        activeSectionId = current;
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (current && link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });

        const activeLink = document.querySelector('.nav-links a.active') || navLinks[0];
        setNavIndicator(activeLink);
    };

    const handleScroll = () => {
        const currentScrollY = window.scrollY;
        scrollingDown = currentScrollY > lastScrollY;
        lastScrollY = currentScrollY;
        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(() => {
                updateActiveSection();
                ticking = false;
            });
        }
    };

    updateSectionMetrics();

    if (supportsIO) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const isBelowViewport = entry.boundingClientRect.top >= window.innerHeight;
                if (entry.isIntersecting && (scrollingDown || window.scrollY === 0)) {
                    entry.target.classList.add('is-visible');
                } else if (!entry.isIntersecting && !scrollingDown && isBelowViewport) {
                    entry.target.classList.remove('is-visible');
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -6% 0px',
        });

        animatedItems.forEach(item => observer.observe(item));

        const slideObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    entry.target.classList.remove('is-exiting');
                    return;
                }

                if (scrollingDown && entry.boundingClientRect.top < window.innerHeight) {
                    entry.target.classList.remove('is-visible');
                    entry.target.classList.add('is-exiting');
                } else {
                    entry.target.classList.remove('is-exiting');
                }
            });
        }, {
            threshold: 0.2,
            rootMargin: '0px 0px -10% 0px',
        });

        skillItems.forEach(item => slideObserver.observe(item));
    } else {
        animatedItems.forEach(item => item.classList.add('is-visible'));
        skillItems.forEach(item => item.classList.add('is-visible'));
    }

    window.addEventListener('scroll', handleScroll, { passive: true });

    window.addEventListener('resize', () => {
        updateSectionMetrics();
        const activeLink = document.querySelector('.nav-links a.active') || navLinks[0];
        setNavIndicator(activeLink);
    });

    setNavIndicator(document.querySelector('.nav-links a.active') || navLinks[0]);
    updateActiveSection();
});
