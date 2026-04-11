# Integration test pattern — hooks, providers, and routes

## Overview

Integration tests render a realistic component tree and mock HTTP at the network boundary using **MSW** (`msw/node`). They exercise the real routing, i18n, and auth context — no individual module mocks.

> See `docs/testing/strategy.md` for layer definitions and the full anti-pattern list.

---

## Minimal harness

```tsx
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext } from "@/auth/authContext";
import { i18n } from "@/i18n";
import { MyPage } from "@/pages/MyPage";
import { makeSession } from "@/test/factories";
import { server } from "@/test/server";

function renderMyPage() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={["/app/my-page"]}>
        <AuthContext.Provider value={{ session: makeSession(), loading: false }}>
          <Routes>
            <Route path="/app/my-page" element={<MyPage />} />
          </Routes>
        </AuthContext.Provider>
      </MemoryRouter>
    </I18nextProvider>,
  );
}
```

### Provider layers

| Layer | Why |
|---|---|
| `I18nextProvider` | Provides the `i18n` instance used by `useTranslation` |
| `MemoryRouter` | Provides routing without a real browser URL bar |
| `AuthContext.Provider` | Provides the session used by `useAuth` |

Add `EntitlementProvider`, `ToastProvider`, etc. as needed for specific pages.

---

## Intercepting network calls with MSW

MSW handlers are added **per test** using `server.use(...)`. They reset automatically after each test (wired in `src/test/setup.ts`).

```tsx
it("shows project list from API", async () => {
  server.use(
    http.get("https://test.supabase.co/rest/v1/projects", () =>
      HttpResponse.json([makeProject({ topic: "Marketing" })]),
    ),
  );

  renderMyPage();

  await expect(screen.findByText("Marketing")).resolves.toBeInTheDocument();
});
```

**Supabase URL in tests:** `https://test.supabase.co` — the fake value set in `vitest.config.ts` via `test.env`. MSW intercepts these calls; they never reach production.

---

## Live examples in the repo

- `obra/src/pages/LoginPage.integration.test.tsx` — full login flow with Supabase auth token endpoint mocked via MSW
- `obra/src/lib/sanitizeChapterHtml.test.ts` — security-critical sanitisation unit tests

---

## Hooks that need a provider

Custom hooks that call `useAuth`, `useTranslation`, or React Router hooks must be wrapped with the matching providers. Use `renderHook` from RTL:

```tsx
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { AuthContext } from "@/auth/authContext";
import { i18n } from "@/i18n";
import { makeSession } from "@/test/factories";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={i18n}>
    <MemoryRouter>
      <AuthContext.Provider value={{ session: makeSession(), loading: false }}>
        {children}
      </AuthContext.Provider>
    </MemoryRouter>
  </I18nextProvider>
);

const { result } = renderHook(() => useMyHook(), { wrapper });
```
