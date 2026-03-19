import unittest
import threading
import http.server
import socketserver
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

DEFAULT_VIEWPORT_WIDTH = 1280
DEFAULT_VIEWPORT_HEIGHT = 800
BLOCKED_HOSTS = {"fonts.googleapis.com", "fonts.gstatic.com"}


class FooterLayoutTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
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
            viewport={"width": DEFAULT_VIEWPORT_WIDTH, "height": DEFAULT_VIEWPORT_HEIGHT}
        )
        self.page = self.context.new_page()
        self.page.route("**/*", self._handle_route)

    def tearDown(self):
        self.context.close()

    @staticmethod
    def _handle_route(route):
        if urlparse(route.request.url).hostname in BLOCKED_HOSTS:
            route.abort()
        else:
            route.continue_()

    def test_footer_column_headers_are_left_aligned(self):
        self.page.goto(self.base_url, wait_until="domcontentloaded")
        self.page.wait_for_selector(".footer-col-heading")

        text_alignments = self.page.evaluate("""() =>
            Array.from(document.querySelectorAll('.footer-col-heading'))
                .map((el) => getComputedStyle(el).textAlign)
        """)

        self.assertGreater(len(text_alignments), 0, "Expected footer column headers to exist")
        self.assertTrue(
            all(alignment == "left" for alignment in text_alignments),
            f"Expected all footer column headers to be left-aligned, got: {text_alignments}"
        )


if __name__ == '__main__':
    unittest.main()
