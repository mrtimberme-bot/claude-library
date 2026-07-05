---
name: webapp-testing-playwright
description: Use when writing, reviewing, or debugging browser automation tests for web surfaces (marketing sites, admin panels, dashboards) alongside an iOS product — covers Playwright locators, page objects, auth/session reuse, visual regression, flaky tests, and headless CI runs.
---
# Webapp Testing (Playwright)

Guidance for writing **resilient, fast, non-flaky** Playwright tests for the web surfaces that accompany an iOS-first product (marketing site, admin panel, web dashboard).

## Core principle

Locate elements the way a user (or assistive tech) would — by role, label, or visible text — never by CSS class or DOM structure. Structure changes; roles and copy are the contract. Second: authenticate once, reuse the session; don't log in inside every test.

## Quick reference

| Need | Playwright API / pattern |
|---|---|
| Click a button by intent | `page.getByRole('button', { name: 'Save' })` |
| Find a field by its label | `page.getByLabel('Email')` |
| Match visible copy | `page.getByText('Welcome back')` |
| Stable hook when no accessible name exists | `data-testid` + `getByTestId()` (last resort) |
| Wait for an element, not a timer | `expect(locator).toBeVisible()` (auto-retries) |
| Wait for a specific response, not "network idle" | `page.waitForResponse(url => ...)` |
| Log in once, reuse everywhere | global setup project → `storageState: 'auth.json'` |
| Isolate tests from each other | new `context`/page per test (Playwright does this by default per test file) |
| Visual regression | `expect(page).toHaveScreenshot('name.png')` |
| Run headless in CI | `playwright.config.ts` → `use: { headless: true }`, `CI=true` env |
| Reduce CI flakiness from animations | `page.addStyleTag` to disable transitions, or `toHaveScreenshot({ animations: 'disabled' })` |

## Example: authenticated dashboard test with reused storage state

`tests/auth.setup.ts` (runs once, saved as a Playwright "setup" project):
```ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
```

`tests/dashboard.spec.ts` (uses the saved session via project config, no login step):
```ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test('admin can invite a teammate', async ({ page }) => {
  await page.goto('/team');
  await page.getByRole('button', { name: 'Invite teammate' }).click();
  await page.getByLabel('Email address').fill('new.dev@example.com');
  await page.getByRole('button', { name: 'Send invite' }).click();

  await expect(page.getByText('Invitation sent')).toBeVisible();
  await expect(page).toHaveScreenshot('team-after-invite.png', { animations: 'disabled' });
});
```

Wire the setup project as a `dependencies: ['setup']` entry for other projects in `playwright.config.ts` so it runs once per suite, not once per test.

## Common mistakes

- **Brittle CSS/XPath selectors** (`.btn-primary > span:nth-child(2)`) break on every markup refactor; prefer `getByRole`/`getByLabel`/`getByText`, falling back to `data-testid` only when no accessible name exists.
- **`waitForLoadState('networkidle')` as a blanket wait** — SPAs with polling or analytics beacons never go idle, causing timeouts or false green tests. Wait on the specific element or response that indicates the action finished; let Playwright's built-in auto-waiting on assertions do the rest.
- **Sharing one browser context across unrelated tests** to "save time" — leftover cookies, localStorage, or in-flight requests leak between tests and cause order-dependent flakiness. Give each independent test its own context/page (Playwright's default); only share `storageState` (a serialized snapshot), never a live context.
- **Re-logging in inside every test** instead of reusing `storageState` — slow, and couples every test's stability to the login flow itself.
- **Visual snapshots without disabling animation/transition** — timing-dependent frames produce non-deterministic diffs in CI; disable animations or use `animations: 'disabled'` on screenshot assertions.
