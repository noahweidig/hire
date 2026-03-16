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

    def test_hire_me_links_to_contact_form(self):
        """Test that all Hire Me buttons navigate to the in-page contact form."""
        links_data = self.page.locator("a.btn-hire").evaluate_all(
            "(elements) => elements.map(a => ({ href: a.getAttribute('href'), target: a.getAttribute('target') }))"
        )

        self.assertGreater(len(links_data), 0, "No Hire Me links found")

        for link in links_data:
            href = link["href"]
            target = link["target"]
            self.assertEqual(href, "#contact-form", f"Hire Me link should point to #contact-form, got {href}")
            self.assertTrue(target in (None, ""), "Hire Me link should not open in a new tab")

    def test_noahweidig_link(self):
        """Test that link to noahweidig.com has rel='noopener noreferrer'."""
        # Performance: Use evaluate_all on locator to bulk retrieve data instead of sequential locator operations
        links_data = self.page.locator("a[href='https://noahweidig.com']").evaluate_all(
            "(elements) => elements.map(a => ({ rel: a.getAttribute('rel') }))"
        )

        self.assertGreater(len(links_data), 0, "No link to noahweidig.com found")

        for link in links_data:
            rel = link["rel"]
            self.assertIn("noopener", rel or "", "Link to noahweidig.com missing 'noopener' in rel attribute")
            self.assertIn("noreferrer", rel or "", "Link to noahweidig.com missing 'noreferrer' in rel attribute")

    def test_project_cards_links(self):
        """Test that project cards link to external sites with secure attributes."""
        project_urls = [
            "https://www.noahweidig.com/quickplot/",
            "https://rpubs.com/noahweidig/us-wildfire-risk",
            "https://gee-community-catalog.org/projects/tiger_roads/"
        ]

        for url in project_urls:
            # Performance: Use evaluate_all on locator to bulk retrieve data instead of sequential locator operations
            link_data_list = self.page.locator(f"a[href='{url}']").evaluate_all(
                "(elements) => elements.map(a => ({ target: a.getAttribute('target'), rel: a.getAttribute('rel') }))"
            )

            self.assertEqual(len(link_data_list), 1, f"Link to {url} not found exactly once")

            target = link_data_list[0]["target"]
            rel = link_data_list[0]["rel"]

            self.assertEqual(target, "_blank", f"Link to {url} missing target='_blank'")
            self.assertIn("noopener", rel or "", f"Link to {url} missing 'noopener' in rel attribute")
            self.assertIn("noreferrer", rel or "", f"Link to {url} missing 'noreferrer' in rel attribute")

    def test_formspree_form_present(self):
        """Test that the contact form submits to Formspree."""
        form = self.page.locator("form[action='https://formspree.io/f/mnjggoke'][method='POST']")
        self.assertEqual(form.count(), 1, "Expected one Formspree contact form")

if __name__ == '__main__':
    unittest.main()
