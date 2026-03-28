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

    def test_csp_strict_directives(self):
        """Test that the Content-Security-Policy meta tag includes all strict defense-in-depth directives."""
        self.page.goto(self.base_url)
        meta_csp = self.page.locator('meta[http-equiv="Content-Security-Policy"]')

        # Verify it exists
        if meta_csp.count() == 0:
            self.fail("Content-Security-Policy meta tag is missing from index.html")

        content = meta_csp.get_attribute("content")
        directives = [d.strip() for d in content.split(';')]

        # Verify default-src 'none'
        default_src = next((d for d in directives if d.startswith("default-src")), None)
        self.assertIsNotNone(default_src, "default-src directive is missing in CSP")
        self.assertIn("'none'", default_src, "CSP default-src should be 'none'")

        # Verify object-src 'none'
        object_src = next((d for d in directives if d.startswith("object-src")), None)
        self.assertIsNotNone(object_src, "object-src directive is missing in CSP")
        self.assertIn("'none'", object_src, "CSP object-src should be 'none'")

        # Verify base-uri 'none'
        base_uri = next((d for d in directives if d.startswith("base-uri")), None)
        self.assertIsNotNone(base_uri, "base-uri directive is missing in CSP")
        self.assertIn("'none'", base_uri, "CSP base-uri should be 'none'")

        # Verify require-trusted-types-for 'script'
        req_trusted_types = next((d for d in directives if d.startswith("require-trusted-types-for")), None)
        self.assertIsNotNone(req_trusted_types, "require-trusted-types-for directive is missing in CSP")
        self.assertIn("'script'", req_trusted_types, "CSP require-trusted-types-for should be 'script'")

        # Verify upgrade-insecure-requests
        upgrade_insecure = next((d for d in directives if d.startswith("upgrade-insecure-requests")), None)
        self.assertIsNotNone(upgrade_insecure, "upgrade-insecure-requests directive is missing in CSP")

        # Verify form-action allows same-origin and Formspree endpoint
        form_action = next((d for d in directives if d.startswith("form-action")), None)
        self.assertIsNotNone(form_action, "form-action directive is missing in CSP")
        self.assertIn("'self'", form_action, "CSP form-action should include 'self'")
        self.assertIn("https://formspree.io", form_action, "CSP form-action should include https://formspree.io")

        # Verify frame-src 'none'
        frame_src = next((d for d in directives if d.startswith("frame-src")), None)
        self.assertIsNotNone(frame_src, "frame-src directive is missing in CSP")
        self.assertIn("'none'", frame_src, "CSP frame-src should be 'none'")

        # Verify trusted-types 'none'
        trusted_types = next((d for d in directives if d.startswith("trusted-types")), None)
        self.assertIsNotNone(trusted_types, "trusted-types directive is missing in CSP")
        self.assertIn("'none'", trusted_types, "CSP trusted-types should be 'none'")

        # Verify connect-src allows same-origin and Formspree endpoint
        connect_src = next((d for d in directives if d.startswith("connect-src")), None)
        self.assertIsNotNone(connect_src, "connect-src directive is missing in CSP")
        self.assertIn("'self'", connect_src, "CSP connect-src should include 'self'")
        self.assertIn("https://formspree.io", connect_src, "CSP connect-src should include https://formspree.io")

        # Verify worker-src 'none'
        worker_src = next((d for d in directives if d.startswith("worker-src")), None)
        self.assertIsNotNone(worker_src, "worker-src directive is missing in CSP")
        self.assertIn("'none'", worker_src, "CSP worker-src should be 'none'")

        # Verify manifest-src 'none'
        manifest_src = next((d for d in directives if d.startswith("manifest-src")), None)
        self.assertIsNotNone(manifest_src, "manifest-src directive is missing in CSP")
        self.assertIn("'none'", manifest_src, "CSP manifest-src should be 'none'")

    def test_csp_no_frame_ancestors_in_meta(self):
        """Test that frame-ancestors is NOT present in the CSP meta tag (as it is unsupported)."""
        self.page.goto(self.base_url)
        meta_csp = self.page.locator('meta[http-equiv="Content-Security-Policy"]')

        if meta_csp.count() == 0:
            self.fail("Content-Security-Policy meta tag is missing from index.html")

        content = meta_csp.get_attribute("content")
        self.assertNotIn("frame-ancestors", content, "frame-ancestors directive should NOT be used in a meta tag as it is unsupported.")

    def test_clickjacking_defense_files_present(self):
        """Test that the 'invisible-by-default' clickjacking defense files are present."""
        self.page.goto(self.base_url)

        # Check for anti-clickjack.css
        css_link = self.page.locator('link[href="anti-clickjack.css"]')
        self.assertTrue(css_link.count() > 0, "anti-clickjack.css link is missing from index.html")

        # Check for anti-clickjack.js
        js_script = self.page.locator('script[src="anti-clickjack.js"]')
        self.assertTrue(js_script.count() > 0, "anti-clickjack.js script is missing from index.html")

if __name__ == '__main__':
    unittest.main()
