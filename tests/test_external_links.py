import unittest
from playwright.sync_api import sync_playwright
import http.server
import socketserver
import threading
import time

class ExternalLinksTest(unittest.TestCase):
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
        self.page.goto(self.base_url)

    def tearDown(self):
        self.context.close()

    def test_forms_gle_links(self):
        """Test that links to forms.gle have target='_blank' and rel='noopener noreferrer'."""
        links = self.page.locator("a[href^='https://forms.gle']")
        count = links.count()
        self.assertGreater(count, 0, "No forms.gle links found")

        for i in range(count):
            link = links.nth(i)
            href = link.get_attribute("href")
            target = link.get_attribute("target")
            rel = link.get_attribute("rel")

            self.assertEqual(target, "_blank", f"Link to {href} missing target='_blank'")
            self.assertIn("noopener", rel or "", f"Link to {href} missing 'noopener' in rel attribute")
            self.assertIn("noreferrer", rel or "", f"Link to {href} missing 'noreferrer' in rel attribute")

    def test_noahweidig_link(self):
        """Test that link to noahweidig.com has rel='noopener noreferrer'."""
        links = self.page.locator("a[href='https://noahweidig.com']")
        count = links.count()
        self.assertGreater(count, 0, "No link to noahweidig.com found")

        for i in range(count):
            link = links.nth(i)
            rel = link.get_attribute("rel")
            self.assertIn("noopener", rel or "", "Link to noahweidig.com missing 'noopener' in rel attribute")
            self.assertIn("noreferrer", rel or "", "Link to noahweidig.com missing 'noreferrer' in rel attribute")

if __name__ == '__main__':
    unittest.main()
