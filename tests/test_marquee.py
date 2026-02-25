import unittest
import threading
import http.server
import socketserver
import os
import time
from playwright.sync_api import sync_playwright

class MarqueeAccessibilityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Start a local server to serve the frontend files
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
        self.context = self.browser.new_context()
        self.page = self.context.new_page()
        # Block external font requests
        self.page.route("**/*", lambda route: route.abort() if "fonts.googleapis.com" in route.request.url or "fonts.gstatic.com" in route.request.url else route.continue_())
        self.page.goto(self.base_url, wait_until="domcontentloaded")

    def tearDown(self):
        self.context.close()

    def test_marquee_structure(self):
        """Test that the marquee has the correct accessibility attributes."""
        marquee = self.page.locator('.skills-marquee')
        self.assertTrue(marquee.is_visible())

        # Check for role="region" or similar appropriate role for a marquee section
        # We expect role="region" after our fix
        self.assertEqual(marquee.get_attribute('role'), 'region', "Marquee should have role='region'")

        # Check for tabindex="0" to ensure keyboard focusability
        self.assertEqual(marquee.get_attribute('tabindex'), '0', "Marquee should have tabindex='0'")

        # Check aria-label exists
        self.assertTrue(marquee.get_attribute('aria-label'), "Marquee should have an aria-label")

    def test_marquee_pause_on_hover(self):
        """Test that the marquee animation pauses on hover."""
        marquee = self.page.locator('.skills-marquee')
        track = self.page.locator('.skills-track').first

        # Initial state: animation running
        # We can check computed style. Note: getComputedStyle might return 'running' even if not hovered
        # But we can check if the rule exists in the stylesheets or if the computed style reflects it when hovered.

        # Hover over the marquee
        marquee.hover()

        # Check if animation-play-state is paused
        play_state = track.evaluate("el => getComputedStyle(el).animationPlayState")
        self.assertEqual(play_state, 'paused', "Animation should be paused on hover")

    def test_marquee_pause_on_focus(self):
        """Test that the marquee animation pauses on focus."""
        marquee = self.page.locator('.skills-marquee')
        track = self.page.locator('.skills-track').first

        # Focus the marquee
        marquee.focus()

        # Check if animation-play-state is paused
        play_state = track.evaluate("el => getComputedStyle(el).animationPlayState")
        self.assertEqual(play_state, 'paused', "Animation should be paused on focus")

if __name__ == '__main__':
    unittest.main()
