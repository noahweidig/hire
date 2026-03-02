import threading
import http.server
import socketserver
from playwright.sync_api import sync_playwright, expect
import time
import os

PORT = 8080
DIRECTORY = "."

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

def verify_theme_icons():
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    time.sleep(1) # wait for server to start

    os.makedirs("/home/jules/verification", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Load the page
        page.goto(f"http://localhost:{PORT}/index.html")

        # Wait for theme toggle to be visible
        theme_toggle = page.locator('.theme-toggle')
        expect(theme_toggle).to_be_visible()

        # Capture light mode
        page.screenshot(path="/home/jules/verification/theme_light.png")

        # Click theme toggle
        theme_toggle.click()

        # Wait a moment for transition and update
        page.wait_for_timeout(500)

        # Capture dark mode
        page.screenshot(path="/home/jules/verification/theme_dark.png")

        # Also let's take a screenshot just of the toggle itself in light and dark mode
        theme_toggle.click() # Back to light mode
        page.wait_for_timeout(500)
        theme_toggle.screenshot(path="/home/jules/verification/theme_toggle_light.png")

        theme_toggle.click() # Back to dark mode
        page.wait_for_timeout(500)
        theme_toggle.screenshot(path="/home/jules/verification/theme_toggle_dark.png")

        browser.close()

if __name__ == "__main__":
    verify_theme_icons()
