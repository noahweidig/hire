import threading
import http.server
import socketserver
import os
import time
from playwright.sync_api import sync_playwright

def start_server():
    os.chdir('/app')
    handler = http.server.SimpleHTTPRequestHandler
    httpd = socketserver.TCPServer(('', 0), handler)
    port = httpd.server_address[1]

    thread = threading.Thread(target=httpd.serve_forever)
    thread.daemon = True
    thread.start()

    return httpd, port

def test_touch_targets():
    httpd, port = start_server()
    print(f"Server started on port {port}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Using a mobile viewport
        context = browser.new_context(viewport={'width': 375, 'height': 667})
        page = context.new_page()

        # Block external fonts
        page.route("**/*.{woff,woff2,ttf,otf,eot}", lambda route: route.abort())
        page.route("**/fonts.googleapis.com/**", lambda route: route.abort())
        page.route("**/fonts.gstatic.com/**", lambda route: route.abort())

        page.goto(f"http://localhost:{port}/")
        page.wait_for_load_state('networkidle')

        # Test back to top button visibility by scrolling
        page.evaluate("window.scrollTo(0, 1000)")
        time.sleep(1) # wait for animation

        page.screenshot(path="/app/verification/verification.png")

        # Output info for visual checking
        theme_toggle_box = page.locator(".theme-toggle").bounding_box()
        back_to_top_box = page.locator(".back-to-top").bounding_box()

        print(f"Theme toggle visible size: {theme_toggle_box['width']}x{theme_toggle_box['height']}")
        print(f"Back to top visible size: {back_to_top_box['width']}x{back_to_top_box['height']}")

        browser.close()

    httpd.shutdown()
    httpd.server_close()

if __name__ == "__main__":
    test_touch_targets()