import unittest
import threading
import http.server
import socketserver
import os
import time
from playwright.sync_api import sync_playwright

class ThemePersistenceTest(unittest.TestCase):
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
        # Block external font requests as per project guidelines to prevent timeouts
        self.page.route("**/*", lambda route: route.abort() if "fonts.googleapis.com" in route.request.url or "fonts.gstatic.com" in route.request.url else route.continue_())

    def tearDown(self):
        self.context.close()

    def navigate(self):
        # Use domcontentloaded to avoid waiting for external assets that might hang
        self.page.goto(self.base_url, wait_until="domcontentloaded")

    def test_initialization_default_light(self):
        """Test that the theme defaults to light mode when no preference is set."""
        self.navigate()

        # Check that data-theme is NOT 'dark' on body
        data_theme = self.page.evaluate("document.body.getAttribute('data-theme')")
        self.assertNotEqual(data_theme, 'dark')

        # Check aria-label of toggle
        aria_label = self.page.get_attribute('.theme-toggle', 'aria-label')
        self.assertEqual(aria_label, 'Toggle dark mode')

    def test_initialization_os_dark_preference(self):
        """Test that the theme respects OS dark mode preference."""
        self.page.emulate_media(color_scheme='dark')
        self.navigate()

        data_theme = self.page.evaluate("document.body.getAttribute('data-theme')")
        self.assertEqual(data_theme, 'dark')

        aria_label = self.page.get_attribute('.theme-toggle', 'aria-label')
        self.assertEqual(aria_label, 'Toggle light mode')

    def test_initialization_localstorage_override(self):
        """Test that localStorage takes precedence over OS preference."""
        # Set OS to dark but localStorage to light
        self.page.add_init_script("localStorage.setItem('theme', 'light')")
        self.page.emulate_media(color_scheme='dark')
        self.navigate()

        data_theme = self.page.evaluate("document.body.getAttribute('data-theme')")
        self.assertNotEqual(data_theme, 'dark')

        aria_label = self.page.get_attribute('.theme-toggle', 'aria-label')
        self.assertEqual(aria_label, 'Toggle dark mode')

    def test_theme_toggle_persistence(self):
        """Test that toggling the theme updates localStorage and persists on reload."""
        self.navigate()

        # Initial state should be light
        self.assertNotEqual(self.page.evaluate("document.body.getAttribute('data-theme')"), 'dark')

        # Click toggle to switch to dark
        self.page.click('.theme-toggle')

        # Verify it's now dark
        self.assertEqual(self.page.evaluate("document.body.getAttribute('data-theme')"), 'dark')

        # Check localStorage
        storage_theme = self.page.evaluate("localStorage.getItem('theme')")
        self.assertEqual(storage_theme, 'dark')

        # Reload and verify persistence
        self.navigate()
        self.assertEqual(self.page.evaluate("document.body.getAttribute('data-theme')"), 'dark')

        # Click toggle again to switch back to light
        self.page.click('.theme-toggle')
        self.assertNotEqual(self.page.evaluate("document.body.getAttribute('data-theme')"), 'dark')
        self.assertEqual(self.page.evaluate("localStorage.getItem('theme')"), 'light')

if __name__ == '__main__':
    unittest.main()
