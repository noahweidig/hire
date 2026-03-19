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

    def test_footer_has_legal_links(self):
        self.page.goto(self.base_url, wait_until="domcontentloaded")
        self.page.wait_for_selector(".footer-col-heading")

        legal_header_count = self.page.locator(".footer-col-heading", has_text="Legal").count()
        self.assertEqual(legal_header_count, 1, "Expected Legal footer header to exist exactly once")

        privacy_button_count = self.page.locator("button.footer-legal-trigger", has_text="Privacy Policy").count()
        terms_button_count = self.page.locator("button.footer-legal-trigger", has_text="Terms & Conditions").count()
        self.assertEqual(privacy_button_count, 1, "Expected Privacy Policy footer legal trigger")
        self.assertEqual(terms_button_count, 1, "Expected Terms & Conditions footer legal trigger")

    def test_footer_legal_links_match_footer_link_font_size(self):
        self.page.goto(self.base_url, wait_until="domcontentloaded")
        self.page.wait_for_selector(".footer-col-heading")

        font_sizes = self.page.evaluate("""() => ({
            footerLink: getComputedStyle(document.querySelector('.footer-col a')).fontSize,
            legalTrigger: getComputedStyle(document.querySelector('.footer-legal-trigger')).fontSize
        })""")

        self.assertEqual(
            font_sizes["legalTrigger"],
            font_sizes["footerLink"],
            f"Expected legal trigger font-size to match footer link font-size, got: {font_sizes}"
        )

    def test_footer_logo_is_slightly_smaller(self):
        self.page.goto(self.base_url, wait_until="domcontentloaded")
        self.page.wait_for_selector(".footer-logo")

        footer_logo_size = self.page.evaluate("""() => {
            const logo = document.querySelector('.footer-logo');
            const styles = getComputedStyle(logo);
            return {
                widthAttr: logo.getAttribute('width'),
                heightAttr: logo.getAttribute('height'),
                widthStyle: styles.width,
                heightStyle: styles.height
            };
        }""")

        self.assertEqual(footer_logo_size["widthAttr"], "44", f"Expected footer logo width attribute to be 44, got {footer_logo_size}")
        self.assertEqual(footer_logo_size["heightAttr"], "44", f"Expected footer logo height attribute to be 44, got {footer_logo_size}")
        self.assertEqual(footer_logo_size["widthStyle"], "44px", f"Expected footer logo width to be 44px, got {footer_logo_size}")
        self.assertEqual(footer_logo_size["heightStyle"], "44px", f"Expected footer logo height to be 44px, got {footer_logo_size}")

    def test_legal_popups_open_and_close(self):
        self.page.goto(self.base_url, wait_until="domcontentloaded")
        privacy_modal = self.page.locator("#privacy-policy-modal")
        terms_modal = self.page.locator("#terms-conditions-modal")

        self.assertEqual(privacy_modal.get_attribute("hidden"), "", "Privacy modal should be hidden by default")
        self.assertEqual(terms_modal.get_attribute("hidden"), "", "Terms modal should be hidden by default")

        self.page.click("button.footer-legal-trigger:has-text('Privacy Policy')")
        self.assertIsNone(privacy_modal.get_attribute("hidden"), "Privacy modal should open after click")
        self.page.click("#privacy-policy-modal [data-legal-modal-close]")
        self.assertEqual(privacy_modal.get_attribute("hidden"), "", "Privacy modal should close via close button")

        self.page.click("button.footer-legal-trigger:has-text('Terms & Conditions')")
        self.assertIsNone(terms_modal.get_attribute("hidden"), "Terms modal should open after click")
        self.page.keyboard.press("Escape")
        self.assertEqual(terms_modal.get_attribute("hidden"), "", "Terms modal should close on Escape")

    def test_terms_headers_are_left_aligned_and_spaced(self):
        self.page.goto(self.base_url, wait_until="domcontentloaded")
        self.page.click("button.footer-legal-trigger:has-text('Terms & Conditions')")

        heading_styles = self.page.evaluate("""() =>
            Array.from(document.querySelectorAll('#terms-conditions-modal h3')).map((el) => {
                const styles = getComputedStyle(el);
                return {
                    textAlign: styles.textAlign,
                    marginTop: styles.marginTop
                };
            })
        """)

        self.assertGreater(len(heading_styles), 0, "Expected Terms & Conditions headings to exist")
        self.assertTrue(
            all(style["textAlign"] == "left" for style in heading_styles),
            f"Expected all Terms headings to be left-aligned, got: {heading_styles}"
        )
        self.assertTrue(
            all(float(style["marginTop"].replace("px", "")) >= 21 for style in heading_styles),
            f"Expected all Terms headings to have increased top margin, got: {heading_styles}"
        )

    def test_terms_email_is_obfuscated_until_revealed(self):
        self.page.goto(self.base_url, wait_until="domcontentloaded")
        self.page.click("button.footer-legal-trigger:has-text('Terms & Conditions')")

        email_state_before = self.page.evaluate("""() => {
            const modalText = document.querySelector('#terms-conditions-modal .legal-modal').innerText;
            const revealButton = document.querySelector('#terms-conditions-modal .terms-email-reveal');
            const output = document.querySelector('#terms-conditions-modal .terms-email-output');
            return {
                hasPlainEmailText: modalText.includes('noah@noahweidig.com'),
                revealButtonHidden: revealButton.hidden,
                outputText: output.textContent.trim()
            };
        }""")

        self.assertFalse(email_state_before["hasPlainEmailText"], f"Email should not appear in plain text before reveal, got: {email_state_before}")
        self.assertFalse(email_state_before["revealButtonHidden"], f"Reveal button should be visible before click, got: {email_state_before}")
        self.assertEqual(email_state_before["outputText"], "", f"Email output should be empty before reveal, got: {email_state_before}")

        self.page.click("#terms-conditions-modal .terms-email-reveal")

        email_state_after = self.page.evaluate("""() => {
            const revealButton = document.querySelector('#terms-conditions-modal .terms-email-reveal');
            const output = document.querySelector('#terms-conditions-modal .terms-email-output');
            return {
                revealButtonHidden: revealButton.hidden,
                outputText: output.textContent.trim()
            };
        }""")

        self.assertTrue(email_state_after["revealButtonHidden"], f"Reveal button should be hidden after click, got: {email_state_after}")
        self.assertEqual(email_state_after["outputText"], "noah@noahweidig.com", f"Email should be revealed after click, got: {email_state_after}")

    def test_legal_popup_uses_floating_card_style(self):
        self.page.goto(self.base_url, wait_until="domcontentloaded")
        self.page.click("button.footer-legal-trigger:has-text('Privacy Policy')")

        modal_styles = self.page.evaluate("""() => {
            const modal = document.querySelector('#privacy-policy-modal .legal-modal');
            const styles = getComputedStyle(modal);
            return {
                borderRadius: styles.borderRadius,
                boxShadow: styles.boxShadow,
                backgroundColor: styles.backgroundColor
            };
        }""")

        self.assertNotEqual(modal_styles["borderRadius"], "0px", f"Expected rounded modal card, got {modal_styles}")
        self.assertNotEqual(modal_styles["boxShadow"], "none", f"Expected elevated modal card, got {modal_styles}")
        self.assertNotEqual(modal_styles["backgroundColor"], "rgba(0, 0, 0, 0)", f"Expected solid modal card background, got {modal_styles}")


if __name__ == '__main__':
    unittest.main()
