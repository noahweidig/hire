import subprocess
from playwright.sync_api import sync_playwright

def check():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.goto("http://localhost:8000")
        page.wait_for_timeout(500)

        section_selector = '#skills'
        page.evaluate(f"document.querySelector('{section_selector}').scrollIntoView()")
        page.wait_for_timeout(1000)

        classes = page.evaluate(f"document.querySelector('{section_selector}').classList.value")
        print(f"Classes after scroll down: {classes}")
        rect = page.evaluate(f"document.querySelector('{section_selector}').getBoundingClientRect().top")
        print(f"Rect Top: {rect}")
        ih = page.evaluate("window.innerHeight")
        print(f"InnerHeight: {ih}")

        page.evaluate("window.scrollTo({ top: 0, behavior: 'instant' })")
        page.wait_for_timeout(1000)

        classes = page.evaluate(f"document.querySelector('{section_selector}').classList.value")
        print(f"Classes after scroll up: {classes}")

        browser.close()

check()
