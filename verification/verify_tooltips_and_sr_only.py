import http.server
import socketserver
import threading
import time
import os
from playwright.sync_api import sync_playwright

def verify_changes():
    # Start a local server to serve the frontend files
    handler = http.server.SimpleHTTPRequestHandler
    httpd = socketserver.TCPServer(("", 0), handler)
    port = httpd.server_address[1]
    server_thread = threading.Thread(target=httpd.serve_forever)
    server_thread.daemon = True
    server_thread.start()

    base_url = f"http://localhost:{port}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Block external fonts to avoid timeouts
        page.route("**/*", lambda route: route.abort() if "fonts.googleapis.com" in route.request.url or "fonts.gstatic.com" in route.request.url else route.continue_())

        page.goto(base_url, wait_until="domcontentloaded")

        # 1. Verify tooltip on theme toggle
        theme_toggle = page.locator(".theme-toggle")
        title_attr = theme_toggle.get_attribute("title")
        print(f"Theme toggle title: {title_attr}")

        # Toggle theme and verify title updates
        theme_toggle.click()
        new_title_attr = theme_toggle.get_attribute("title")
        print(f"Theme toggle title after click: {new_title_attr}")

        # 2. Verify tooltip on back-to-top
        # Scroll down to make back-to-top visible (though title is on DOM anyway)
        page.evaluate("window.scrollTo(0, 1000)")
        time.sleep(1) # wait for IntersectionObserver to trigger and show button
        back_to_top = page.locator("#back-to-top")
        back_to_top_title = back_to_top.get_attribute("title")
        print(f"Back to top title: {back_to_top_title}")

        # Take a screenshot to show the elements
        os.makedirs("verification", exist_ok=True)
        page.screenshot(path="verification/verification.png")

        # Also screenshot the sr-only text in the DOM by making it temporarily visible
        # This is just for visual proof in the screenshot
        page.evaluate('''
            document.querySelectorAll('.sr-only').forEach(el => {
                el.style.position = 'static';
                el.style.width = 'auto';
                el.style.height = 'auto';
                el.style.overflow = 'visible';
                el.style.clip = 'auto';
                el.style.color = 'red'; // Make it stand out
            });
        ''')
        page.screenshot(path="verification/verification_sr_only_visible.png")

        browser.close()

    httpd.shutdown()
    httpd.server_close()

if __name__ == "__main__":
    verify_changes()
