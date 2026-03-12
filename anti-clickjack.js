// Security: Frame-busting defense against clickjacking
try {
    if (window.self === window.top) {
        document.documentElement.classList.remove('anti-clickjack');
    } else {
        // Security enhancement: Pass the string URL (.href) rather than the Location object
        // to prevent potential cross-origin object reference errors in strict environments.
        window.top.location.replace(window.self.location.href);
    }
} catch (e) {
    // Fail securely if browser sandbox blocks window.top access
    console.warn('Frame-busting check blocked by browser sandbox');
}
