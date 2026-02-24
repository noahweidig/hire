import unittest
import threading
import http.server
import socketserver
import os
import time
from playwright.sync_api import sync_playwright

class BackToTopTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Start a local server to serve the frontend files
        # Use 0 to bind to a random free port
        handler = http.server.SimpleHTTPRequestHandler
        cls.httpd = socketserver.TCPServer(("", 0), handler)
        cls.port = cls.httpd.server_address[1]
        cls.server_thread = threading.Thread(target=cls.httpd.serve_forever)
        cls.server_thread.daemon = True
        cls.server_thread.start()

        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True)
        cls.base_url = f"http://localhost:{cls.port}"

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def setUp(self):
        self.context = self.browser.new_context(
            viewport={'width': 1280, 'height': 800}
        )
        self.page = self.context.new_page()
        # Block external font requests
        self.page.route("**/*", lambda route: route.abort() if "fonts.googleapis.com" in route.request.url or "fonts.gstatic.com" in route.request.url else route.continue_())

    def tearDown(self):
        self.context.close()

    def navigate(self):
        self.page.goto(self.base_url, wait_until="domcontentloaded")
        self.page.wait_for_timeout(500)

    def test_back_to_top_button_visibility_and_functionality(self):
        """Test the Back to Top button behavior."""
        self.navigate()

        button_selector = '#back-to-top'
        hero_selector = '#hero'

        # 1. Verify button exists
        button = self.page.locator(button_selector)
        self.assertTrue(button.count() > 0, "Back to Top button should exist in DOM")

        # 2. Verify button is initially hidden (at top of page)
        # Check for 'is-visible' class
        is_visible_class = self.page.evaluate(f"document.querySelector('{button_selector}').classList.contains('is-visible')")
        self.assertFalse(is_visible_class, "Button should be hidden initially at top")

        # 3. Scroll down past the hero section
        # Get hero height to know how much to scroll
        hero_height = self.page.locator(hero_selector).bounding_box()['height']
        scroll_target = hero_height + 100 # Scroll past hero

        self.page.evaluate(f"window.scrollTo({{ top: {scroll_target}, behavior: 'instant' }})")
        self.page.wait_for_timeout(500) # Wait for observer

        # 4. Verify button becomes visible
        is_visible_class = self.page.evaluate(f"document.querySelector('{button_selector}').classList.contains('is-visible')")
        self.assertTrue(is_visible_class, "Button should be visible after scrolling past hero")

        # 5. Click the button
        button.click()

        # Wait for smooth scroll to finish (might take a moment)
        # Or check repeatedly
        self.page.wait_for_timeout(1500)

        # 6. Verify scroll position is back to top (approx 0)
        scroll_y = self.page.evaluate("window.scrollY")
        self.assertLess(scroll_y, 10, "Scroll position should be near 0 after clicking Back to Top")

        # 7. Verify button becomes hidden again
        # Wait for observer to update
        self.page.wait_for_timeout(500)
        is_visible_class = self.page.evaluate(f"document.querySelector('{button_selector}').classList.contains('is-visible')")
        self.assertFalse(is_visible_class, "Button should be hidden again after scrolling to top")

        # 8. Verify focus moved to skip link
        # The logic: skipLink.focus()
        active_element_selector = self.page.evaluate("document.activeElement.className")
        self.assertIn("skip-link", active_element_selector, "Focus should move to skip-link")

if __name__ == '__main__':
    unittest.main()
