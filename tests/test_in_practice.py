import unittest
import threading
import http.server
import socketserver
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright


class InPracticeTest(unittest.TestCase):
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
        self.context = self.browser.new_context(viewport={'width': 1280, 'height': 800})
        self.page = self.context.new_page()
        blocked_hosts = {"fonts.googleapis.com", "fonts.gstatic.com"}
        self.page.route(
            "**/*",
            lambda route: route.abort() if urlparse(route.request.url).hostname in blocked_hosts else route.continue_()
        )

    def tearDown(self):
        self.context.close()

    def test_in_practice_section_is_not_left_hidden_on_desktop(self):
        self.page.goto(self.base_url, wait_until="domcontentloaded")
        self.page.wait_for_timeout(500)

        section_state = self.page.evaluate("""() => {
            const section = document.querySelector('#in-practice');
            const style = getComputedStyle(section);
            return {
                hasScrollFade: section.classList.contains('scroll-fade'),
                hasIsVisible: section.classList.contains('is-visible'),
                opacity: style.opacity
            };
        }""")

        self.assertFalse(section_state["hasScrollFade"], "In Practice should not use the global scroll-fade wrapper on desktop")
        self.assertTrue(section_state["hasIsVisible"], "In Practice should remain visible on desktop load")
        self.assertEqual(section_state["opacity"], '1', "In Practice should not remain faded out on desktop load")

    def test_in_practice_fallback_without_intersection_observer(self):
        page_errors = []
        self.page.on("pageerror", lambda error: page_errors.append(str(error)))
        self.page.add_init_script("delete window.IntersectionObserver;")

        self.page.goto(self.base_url, wait_until="domcontentloaded")
        self.page.wait_for_timeout(500)

        self.assertEqual(page_errors, [], "Script should not throw when IntersectionObserver is unavailable")

        stats = self.page.evaluate("""() => ({
            visibleActs: document.querySelectorAll('.ip-act.ip-visible').length,
            totalActs: document.querySelectorAll('.ip-act').length,
            revealedScenes: document.querySelectorAll('.ip-scroll-scene.scene-revealed').length,
            totalScenes: document.querySelectorAll('.ip-scroll-scene').length
        })""")

        self.assertEqual(stats["visibleActs"], stats["totalActs"])
        self.assertEqual(stats["revealedScenes"], stats["totalScenes"])


if __name__ == '__main__':
    unittest.main()
