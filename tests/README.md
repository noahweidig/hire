# Frontend Integration Tests

This directory contains integration tests for the portfolio's frontend logic, specifically focusing on theme persistence and initialization.

## Why Python & Playwright?

Given that this is a static, "no-build" project without a `package.json`, we opted for a Python-based testing suite using **Playwright** for the following reasons:

1.  **Environment Constraints:** The sandbox environment provides Playwright for Python pre-installed, whereas standard JavaScript testing utilities (like JSDOM) are not available without additional network-dependent setup.
2.  **True Integration Testing:** Unlike JSDOM, Playwright runs in a real browser context. This allows us to verify that the JavaScript interacts correctly with the `index.html` structure and responds accurately to browser features like `matchMedia` and `localStorage`.
3.  **No Project Bloat:** This approach avoids adding `node_modules`, `package.json`, and complex build steps to a simple static site, keeping the repository clean while still ensuring high reliability.

## Running Tests

To run the tests locally, ensure you have the dependencies installed:

```bash
pip install -r requirements.txt
```

Then execute the test suite:

```bash
python3 tests/test_theme.py
```
