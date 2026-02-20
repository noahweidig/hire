import unittest
import threading
import http.server
import socketserver
import os
import time
from playwright.sync_api import sync_playwright

class ScrollBehaviorTest(unittest.TestCase):
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
        # Ensure initial load is settled
        self.page.wait_for_timeout(500)

    def test_scroll_down_triggers_visible(self):
        """Test that scrolling down reveals elements (adds 'is-visible')."""
        self.navigate()

        # Target the 'what-i-do' section which is initially below the fold
        section_selector = '#what-i-do'

        # Verify initial state: should not have is-visible (assuming it's below fold)
        # Note: Depending on screen size, it might be visible. But assuming standard desktop height 800.
        # Check bounding box first
        box = self.page.locator(section_selector).bounding_box()
        if box['y'] < 800:
            print(f"Skipping initial check as section is visible at Y={box['y']}")
        else:
            is_visible_class = self.page.evaluate(f"document.querySelector('{section_selector}').classList.contains('is-visible')")
            self.assertFalse(is_visible_class, "Section should not be visible initially if below fold")

        # Scroll down to the section
        self.page.locator(section_selector).scroll_into_view_if_needed()
        self.page.wait_for_timeout(500) # Wait for observer callback

        # Check if is-visible is added
        is_visible_class = self.page.evaluate(f"document.querySelector('{section_selector}').classList.contains('is-visible')")
        self.assertTrue(is_visible_class, "Section should have 'is-visible' class after scrolling down")

    def test_scroll_up_hides_visible_if_below(self):
        """Test that scrolling up past an element (it exits bottom) removes 'is-visible'."""
        self.navigate()
        # Use a lower section to ensure it's definitely below the fold at top
        section_selector = '#skills'

        # Scroll down to reveal it
        self.page.locator(section_selector).scroll_into_view_if_needed()
        self.page.wait_for_timeout(500)

        # Verify it is visible
        is_visible_class = self.page.evaluate(f"document.querySelector('{section_selector}').classList.contains('is-visible')")
        self.assertTrue(is_visible_class)

        # Scroll back up to top so element exits bottom
        # Force instant scroll to avoid smooth scroll delays
        self.page.evaluate("window.scrollTo({ top: 0, behavior: 'instant' })")
        self.page.wait_for_timeout(1000)

        # Check if is-visible is removed
        # Wait, if we scroll up, it exits to bottom.
        # Original code logic: !isIntersecting && !scrollingDown && isBelowViewport
        # We scrolled up (!scrollingDown is true).
        # It exited bottom (isBelowViewport is true).
        # So it should be removed.

        is_visible_class = self.page.evaluate(f"document.querySelector('{section_selector}').classList.contains('is-visible')")
        self.assertFalse(is_visible_class, "Section should NOT have 'is-visible' class after scrolling up past it")

    def test_scroll_up_does_not_trigger_visible_entering_from_top(self):
        """Test that entering from top (scrolling up) does NOT trigger visible (per current behavior)."""
        self.navigate()
        section_selector = '#what-i-do'

        # First, scroll past it to the bottom of the page
        self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        self.page.wait_for_timeout(500)

        # At this point:
        # 1. We loaded at top.
        # 2. Scrolled to bottom.
        # 3. Passed #what-i-do. It entered (got is-visible) and exited top.
        # Wait, if it exits top, does it keep is-visible?
        # Logic: !isIntersecting && !scrollingDown && isBelowViewport.
        # We scrolled down (scrollingDown=true).
        # It exited top (isBelowViewport=false).
        # So removal condition failed.
        # So it HAS is-visible.

        # We want to test entering from top WITHOUT having is-visible first.
        # This is tricky because we have to pass it to get below it.
        # Unless we reload at the bottom?

        # Reload page at bottom position
        # We can simulate this by setting scroll position immediately after navigation?
        # Or running script?
        pass # Skipping complex setup for now, let's try reload

    def test_reload_at_bottom_scroll_up(self):
        """Test behavior when reloading at bottom and scrolling up."""
        self.navigate()
        # Scroll to bottom
        self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        self.page.wait_for_timeout(500)

        # Now reload. Browser might restore scroll position.
        # We force it.
        self.page.reload()
        self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        self.page.wait_for_timeout(500)

        # Now we are at bottom.
        # #what-i-do is above viewport.
        section_selector = '#what-i-do'

        # Note: Depending on load timing, the section might have been revealed during scroll.
        # We manually hide it to test the "enter from top" behavior cleanly.
        self.page.evaluate(f"document.querySelector('{section_selector}').classList.remove('is-visible')")
        # Wait longer than the 1000ms initial check timeout in script.js
        self.page.wait_for_timeout(1500)

        # Check state (hidden)
        is_visible_class = self.page.evaluate(f"document.querySelector('{section_selector}').classList.contains('is-visible')")
        self.assertFalse(is_visible_class, "Section should be hidden manually")

        # Now scroll UP to reveal it (enter from top)
        # Use instant scroll to ensure we are testing the logic, not animation
        # We need to scroll UP. So we scroll to a position above the element.
        # But scroll_into_view_if_needed might use smooth scroll?
        # Let's use JS to scroll to element position.

        # Get element Y and Height
        box = self.page.locator(section_selector).bounding_box()
        element_y = box['y'] + self.page.evaluate("window.scrollY") # Absolute Y
        height = box['height']

        # Scroll so that only bottom 20% is visible at top of viewport
        # This simulates entering from top
        target_scroll_y = element_y + height - (height * 0.2)

        self.page.evaluate(f"window.scrollTo({{ top: {target_scroll_y}, behavior: 'instant' }})")
        self.page.wait_for_timeout(1000)

        # Check if is-visible is added
        # Original code: scrollingDown becomes false (scrolling up).
        # Condition: isIntersecting && (scrollingDown || scrollY=0).
        # true && (false || false) -> False.
        # So is-visible is NOT added.

        is_visible_class = self.page.evaluate(f"document.querySelector('{section_selector}').classList.contains('is-visible')")
        self.assertFalse(is_visible_class, "Section should NOT have 'is-visible' when entering from top (current behavior)")

if __name__ == '__main__':
    unittest.main()
