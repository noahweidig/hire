import time
import http.server
import socketserver
import threading
from playwright.sync_api import sync_playwright

def start_server():
    # Use a custom handler to suppress logs
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, format, *args):
            pass

    handler = QuietHandler
    # Bind to port 0 to let OS choose
    httpd = socketserver.TCPServer(("", 0), handler)
    port = httpd.server_address[1]
    thread = threading.Thread(target=httpd.serve_forever)
    thread.daemon = True
    thread.start()
    return httpd, port

def verify(page, port):
    print(f"Navigating to http://localhost:{port}")
    # Navigate
    page.goto(f"http://localhost:{port}")
    page.wait_for_timeout(1000) # Wait for initial animations

    # Screenshot Hero (should be visible)
    page.screenshot(path="verification/hero.png")
    print("Hero screenshot taken.")

    # Scroll down to "What I Do"
    page.locator("#what-i-do").scroll_into_view_if_needed()
    page.wait_for_timeout(1000) # Wait for fade in
    page.screenshot(path="verification/what_i_do.png")
    print("What I Do screenshot taken.")

    # Scroll down to "Skills"
    page.locator("#skills").scroll_into_view_if_needed()
    page.wait_for_timeout(1000)
    page.screenshot(path="verification/skills.png")
    print("Skills screenshot taken.")

    # Check if they have 'is-visible' class
    # Note: animatedItems are children of main.
    hero_visible = page.evaluate("document.querySelector('#hero').classList.contains('is-visible')")
    print(f"Hero section is-visible: {hero_visible}")

    what_i_do_visible = page.evaluate("document.querySelector('#what-i-do').classList.contains('is-visible')")
    print(f"What I Do section is-visible: {what_i_do_visible}")

if __name__ == "__main__":
    httpd, port = start_server()

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        try:
            verify(page, port)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
            httpd.shutdown()
            httpd.server_close()
