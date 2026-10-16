---
name: testing-playwright
description: Write reliable end-to-end tests with Playwright — config, projects/browsers, authentication via storageState, role-based locators, web-first assertions, Page Object/fixtures, network mocking, visual and accessibility checks, test data, and CI sharding with traces. Use this skill whenever the user wants E2E tests, browser tests, tests for login/checkout/forms/user flows, flaky test fixes, or Playwright setup — even if they just say "test this page".
---

# Playwright E2E Testing

E2E tests verify critical user journeys in a real browser. Keep them **few, stable, independent, and user-centric**.

## What to cover
Login/logout, signup, the top 5 revenue/business flows, permissions (role can/can't), critical forms, payment/checkout, and smoke of each main page. Leave edge-case logic to unit tests.

## Config
```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" }, dependencies: ["setup"] },
    { name: "mobile", use: { ...devices["iPhone 14"], storageState: "e2e/.auth/user.json" }, dependencies: ["setup"] },
  ],
  webServer: { command: "npm run build && npm run start", url: "http://localhost:3000", reuseExistingServer: !process.env.CI, timeout: 180_000 },
});
```

## Auth once, reuse
```ts
// e2e/auth.setup.ts
import { test as setup, expect } from "@playwright/test";
setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_USER!);
  await page.getByLabel("Password").fill(process.env.E2E_PASS!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
```
Multiple roles → one storage file per role (`admin.json`, `viewer.json`). Add `e2e/.auth` to `.gitignore`.

## Locators (priority)
1. `getByRole("button", { name: "Save" })`
2. `getByLabel("Email")`
3. `getByPlaceholder`, `getByText`
4. `getByTestId("invoice-row")` (set `data-testid`) for non-semantic cases
Avoid CSS/XPath chains and `nth()` on unstable lists. Scope: `page.getByRole("row", { name: /INV-001/ }).getByRole("button", { name: "Edit" })`.

## Web-first assertions — no sleeps
```ts
await expect(page.getByRole("alert")).toHaveText("Invoice saved");
await expect(page).toHaveURL(/\/invoices\/\w+/);
await expect(page.getByRole("row")).toHaveCount(11);
```
Never `waitForTimeout`. Wait for a visible outcome or a response: `await page.waitForResponse(r => r.url().includes("/api/invoices") && r.ok())`.

## Fixtures & page objects
```ts
// e2e/fixtures.ts
import { test as base } from "@playwright/test";
class InvoicesPage {
  constructor(private page: Page) {}
  goto = () => this.page.goto("/invoices");
  create = async (customer: string, amount: string) => {
    await this.page.getByRole("button", { name: "New invoice" }).click();
    await this.page.getByLabel("Customer").fill(customer);
    await this.page.getByLabel("Amount").fill(amount);
    await this.page.getByRole("button", { name: "Create invoice" }).click();
  };
}
export const test = base.extend<{ invoices: InvoicesPage; seed: Seeder }>({
  invoices: async ({ page }, use) => use(new InvoicesPage(page)),
  seed: async ({ request }, use) => { const s = new Seeder(request); await use(s); await s.cleanup(); },
});
export { expect } from "@playwright/test";
```

## Test data
- Each test creates its own data via API/seed endpoint (test-only, protected) and cleans up.
- Use unique values (`inv-${Date.now()}-${testInfo.workerIndex}`) for parallel safety.
- Never depend on other tests' order or leftovers.

## Network mocking
```ts
await page.route("**/api/exchange-rates", r => r.fulfill({ json: { usd: 1, khr: 4100 } }));
await page.route("**/api/orders", r => r.fulfill({ status: 500, json: { message: "boom" } })); // error state
```
Mock third parties; hit your real backend for core flows.

## Visual & a11y
```ts
await expect(page).toHaveScreenshot("dashboard.png", { mask: [page.getByTestId("timestamp")], maxDiffPixelRatio: 0.01 });
const { violations } = await new AxeBuilder({ page }).analyze(); expect(violations).toEqual([]);
```
Generate baselines in the same OS as CI (use the Playwright Docker image).

## Fixing flakiness
Open the trace (`npx playwright show-trace`). Common causes: fixed sleeps, shared data, animations (`reducedMotion: "reduce"`), non-unique locators, hydration race (wait for an interactive element), time-dependent data (`page.clock.install()`).

## CI
```yaml
- run: npx playwright install --with-deps
- run: npx playwright test --shard=${{ matrix.shard }}/4
- uses: actions/upload-artifact@v4
  if: ${{ !cancelled() }}
  with: { name: playwright-report-${{ matrix.shard }}, path: playwright-report }
```

## Checklist
- [ ] Critical journeys covered; each test independent
- [ ] Role/label locators; no sleeps
- [ ] Auth via storageState per role
- [ ] Own test data + cleanup
- [ ] Traces/reports uploaded in CI
- [ ] Mobile project included
