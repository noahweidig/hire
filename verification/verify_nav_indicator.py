from playwright.sync_api import Page, expect, sync_playwright
import os
import time

def test_nav_indicator(page: Page):
    # Get absolute path to index.html
    html_path = f"file://{os.path.abspath('index.html')}"

    # Open the page
    page.goto(html_path)

    # Wait for the nav bar to be ready
    nav_list = page.locator(".nav-links")
    expect(nav_list).to_be_visible()

    # Make the window wide enough to see the nav links (desktop layout)
    page.set_viewport_size({"width": 1280, "height": 800})

    # Take a baseline screenshot
    page.screenshot(path="verification/baseline.png")

    # Hover over the second link ("What I Do")
    what_i_do_link = page.locator(".nav-links a", has_text="What I Do")
    what_i_do_link.hover()

    # Wait a moment for the transition to occur
    time.sleep(0.5)

    # Take a screenshot showing the indicator moved to the hovered link
    page.screenshot(path="verification/hover_indicator.png")

    # Remove hover by hovering somewhere else
    page.mouse.move(10, 10)

    # Wait for indicator to snap back
    time.sleep(0.5)

    # Take a screenshot showing indicator returned
    page.screenshot(path="verification/returned_indicator.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_nav_indicator(page)
            print("Verification screenshots generated successfully.")
        finally:
            browser.close()
