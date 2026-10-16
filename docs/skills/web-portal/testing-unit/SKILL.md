---
name: testing-unit
description: Write fast, meaningful unit and integration tests with Vitest (or Jest) and React Testing Library — testing components, hooks, utilities, zod schemas, Server Actions, and API handlers; mocking with MSW and vi.mock; coverage strategy; and test structure. Use this skill whenever the user asks to write tests, add test coverage, test a component/hook/function, set up Vitest/Jest, or fix failing tests.
---

# Unit & Integration Testing

Test **behavior, not implementation**. A good test fails when the feature breaks and passes when you refactor.

## Test pyramid for a portal
- Many: pure functions, schemas, reducers, permission logic (ms each)
- Some: components & hooks with RTL + MSW (integration-style)
- Few: Playwright E2E for critical journeys

## Setup (Vitest)
```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    coverage: { provider: "v8", reporter: ["text", "html", "lcov"], include: ["src/**"], exclude: ["**/*.stories.tsx", "src/app/**/layout.tsx"] },
  },
});
```
```ts
// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./src/test/msw/server";
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); cleanup(); });
afterAll(() => server.close());
```
Use `environment: "node"` (per-file `// @vitest-environment node`) for server code.

## Pure logic
```ts
describe("can()", () => {
  it.each([
    ["admin", "billing:manage", true],
    ["member", "billing:manage", false],
    ["viewer", "reports:read", true],
  ] as const)("%s → %s = %s", (role, perm, expected) => {
    expect(can({ role }, perm)).toBe(expected);
  });
});
```

## Components (RTL)
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("shows validation error and does not submit", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<InviteForm onSubmit={onSubmit} />);
  await user.type(screen.getByLabelText(/email/i), "not-an-email");
  await user.click(screen.getByRole("button", { name: /send invite/i }));
  expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});
```
Query priority: `getByRole` → `getByLabelText` → `getByText` → `getByTestId`. Use `findBy*` for async. Don't test internal state or CSS classes.

## Providers wrapper
```tsx
export function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}
```

## MSW for network
```ts
// src/test/msw/handlers.ts
export const handlers = [
  http.get("*/api/users", () => HttpResponse.json({ items: [{ id: "1", name: "Dara" }], nextCursor: null })),
];
// per-test override
server.use(http.get("*/api/users", () => HttpResponse.json({ message: "fail" }, { status: 500 })));
```

## Hooks
```ts
const { result } = renderHook(() => useCounter(), { wrapper });
act(() => result.current.increment());
expect(result.current.count).toBe(1);
```

## Server Actions / handlers
Test as functions in node env; mock auth and DB boundaries (or use a test DB via Testcontainers for integration).
```ts
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn().mockResolvedValue({ userId: "u1", orgId: "o1" }) }));
it("rejects invalid input", async () => {
  const fd = new FormData(); fd.set("name", "");
  const res = await updateUser(null, fd);
  expect(res).toMatchObject({ ok: false });
});
```
Route handler: `const res = await GET(new Request("http://x/api/items?limit=5")); expect(res.status).toBe(200);`
Async Server Components: prefer E2E; or `render(await Page({ params: Promise.resolve({ id: "1" }) }))` for simple ones.

## Time & randomness
`vi.useFakeTimers(); vi.setSystemTime(new Date("2026-01-01"))`; restore in `afterEach`. Seed or inject random/ID generators.

## Structure & naming
- Colocate: `Button.tsx` + `Button.test.tsx`.
- Arrange–Act–Assert; one behavior per test; name as sentence: "disables submit while saving".
- Factories for test data (`buildUser({ role: "admin" })`) instead of giant fixtures.

## Coverage
Aim for high coverage on domain logic (permissions, pricing, validation) — ~80%+ overall is a guide, not a goal. Enforce thresholds in CI to prevent regressions.

## Anti-patterns
- Snapshot tests of large component trees
- Mocking the thing under test / mocking React internals
- Testing implementation details (state, private functions)
- Shared mutable state between tests
- `waitFor` wrapping side-effects

## Checklist
- [ ] Domain logic unit tested with table tests
- [ ] Components tested via user interactions & roles
- [ ] Network mocked with MSW (unhandled = error)
- [ ] Error/empty/loading states tested
- [ ] Runs in CI with coverage threshold
