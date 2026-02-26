import unittest
from playwright.sync_api import sync_playwright
import http.server
import socketserver
import threading

class SecurityHeadersTest(unittest.TestCase):
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

    def tearDown(self):
        self.context.close()

    def test_referrer_policy_meta_tag(self):
        """Test that the Referrer-Policy meta tag is present and set correctly."""
        self.page.goto(self.base_url)
        # Check for <meta name="referrer" content="strict-origin-when-cross-origin">
        meta_referrer = self.page.locator('meta[name="referrer"]')

        # Verify it exists
        if meta_referrer.count() == 0:
            self.fail("Referrer-Policy meta tag is missing from index.html")

        # Verify content attribute
        content = meta_referrer.get_attribute("content")
        self.assertEqual(content, "strict-origin-when-cross-origin",
                         f"Expected content='strict-origin-when-cross-origin', got '{content}'")

    def test_csp_violations(self):
        """Test for CSP violations in the browser console."""
        console_messages = []
        self.page.on("console", lambda msg: console_messages.append(msg.text))

        self.page.goto(self.base_url)
        # Wait for potential deferred loading
        self.page.wait_for_timeout(2000)

        csp_violations = [msg for msg in console_messages if "Content Security Policy" in msg]

        if csp_violations:
            for violation in csp_violations:
                print(f"CSP Violation found: {violation}")
            self.fail(f"Found {len(csp_violations)} CSP violations")

    def test_csp_img_src_no_data(self):
        """Test that the Content-Security-Policy meta tag does not allow data: in img-src."""
        self.page.goto(self.base_url)
        meta_csp = self.page.locator('meta[http-equiv="Content-Security-Policy"]')

        # Verify it exists
        if meta_csp.count() == 0:
            self.fail("Content-Security-Policy meta tag is missing from index.html")

        content = meta_csp.get_attribute("content")

        # Parse img-src directive
        directives = [d.strip() for d in content.split(';')]
        img_src = next((d for d in directives if d.startswith('img-src')), None)

        self.assertIsNotNone(img_src, "img-src directive is missing in CSP")
        self.assertNotIn("data:", img_src, "CSP img-src should not contain 'data:'")

if __name__ == '__main__':
    unittest.main()
