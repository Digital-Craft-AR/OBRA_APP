# E2E Patterns — Playwright

Canonical patterns for Obra's E2E test suite (`obra/e2e/`). **Add new patterns here as they are established.** When a pattern is used in more than one test file it belongs in this doc and, if reusable, in `obra/e2e/helpers/`.

---

## 1. Selectors — always use `data-testid`

Label text and ARIA names are locale-dependent (the app ships in `es` and `pt-BR`). A label that reads "Correo" in Spanish is "E-mail" in Portuguese — `getByLabel(/e-?mail/i)` either matches nothing or matches the wrong element depending on the active locale.

**Rule:** every interactive element the test suite touches must have a `data-testid`. Use `page.getByTestId()` in tests.

### Adding a testid to a component

`ObraInput` spreads `...props` to the underlying `<input>`, so pass it directly:

```tsx
// LoginPage.tsx
<ObraInput
  label={t("auth.email")}
  type="email"
  data-testid="login-email"   // ← flows through to <input>
  ...
/>
<Button data-testid="login-submit" type="submit">
  {t("auth.submit")}
</Button>
```

### Naming convention

```
<page>-<element>
```

| testid | Element |
|---|---|
| `login-email` | Email input on LoginPage |
| `login-password` | Password input on LoginPage |
| `login-submit` | Submit button on LoginPage |
| `register-name` | Full name input on RegisterPage |
| `register-email` | Email input on RegisterPage |
| `register-password` | Password input on RegisterPage |
| `register-submit` | Submit button on RegisterPage |
| `check-email-heading` | "Revisá tu correo" heading shown after signup (RegisterPage) |
| `new-project-locale-es` | Spanish locale button on NewProjectPage |
| `new-project-locale-pt-BR` | Portuguese locale button on NewProjectPage |
| `new-project-source-ai` | "AI" source card on NewProjectPage |
| `new-project-source-upload` | "Upload" source card on NewProjectPage |
| `new-project-create-btn` | Continue/Create button on NewProjectPage |
| `wizard-structure-next-btn` | Next/Continue button on WizardStructurePage (all 7 inner steps) |
| `wizard-topic` | Topic textarea (structure wizard step 0) |
| `wizard-avatar` | Target avatar textarea (structure wizard step 1) |
| `wizard-problem` | Problem textarea (structure wizard step 1) |
| `wizard-main-title` | Custom main title input (structure wizard step 3) |
| `manuscript-file-input` | Hidden file input on ManuscriptUploadPanel |
| `alignment-generating` | Loading div while ai-split-proposal is running |
| `alignment-review` | Review panel shown after ai-split-proposal returns |
| `alignment-approve-btn` | Approve button on ContentUploadAlignmentPanel |
| `alignment-regenerate-btn` | Regenerate button on ContentUploadAlignmentPanel |
| `chapter-approve-btn` | Per-chapter Approve button on ContentChapterMilestone |
| `chapter-generate-btn` | Per-chapter AI Generate button (AI path only) |
| `content-approve-artifact-btn` | Footer "Approve all chapters" button (generating phase) |
| `content-go-to-preview-btn` | Footer "Go to preview" button (complete phase) |
| `preview-export-zip-btn` | ZIP export button on WizardPreviewPage |
| `preview-export-pdf-btn` | PDF export/generate button on WizardPreviewPage |
| `new-project-btn` | "New project" button in DashboardPage header |
| `project-tab-active` | "Active" lifecycle tab button on DashboardPage |
| `project-tab-archived` | "Archived" lifecycle tab button on DashboardPage |
| `project-tab-trash` | "Trash" lifecycle tab button on DashboardPage |
| `project-card-{id}` | Project summary card wrapper (id = project UUID) |
| `project-card-menu-{id}` | "More actions" kebab button on a project card |
| `project-card-rename-{id}` | "Rename" item in the project card dropdown |
| `project-card-duplicate-{id}` | "Duplicate" item in the project card dropdown |
| `project-card-archive-{id}` | "Archive" item in the project card dropdown |
| `project-card-trash-{id}` | "Move to trash" item in the project card dropdown |
| `archive-modal-confirm` | Confirm button in the archive confirmation modal |
| `archive-modal-cancel` | Cancel button in the archive confirmation modal |
| `trash-modal-confirm` | Confirm button in the move-to-trash confirmation modal |
| `trash-modal-cancel` | Cancel button in the move-to-trash confirmation modal |
| `trash-retention-notice` | 30-day retention warning shown above the Trash tab project list |
| `create-project-name` | Project name input in the new project modal (step 1) |
| `create-modal-next` | "Next" button in the new project modal (steps 1 and 2) |
| `create-modal-create` | "Create" button in the new project modal (step 3) |

> Add rows to this table as new testids are introduced.

### In tests

```typescript
await page.getByTestId("login-email").fill(email);
await page.getByTestId("login-password").fill(password);
await page.getByTestId("login-submit").click();
```

---

## 2. Waiting — always `waitForResponse`, never arbitrary timeouts

Arbitrary timeouts (`{ timeout: 15_000 }`) are guesses: they either make tests slow (too long) or flaky (too short). Instead, wait for the actual network event that represents completion.

**Rule:** register `page.waitForResponse()` **before** the action that triggers the request, then `await` the promise after.

### Why before?

```typescript
// ❌ Race condition — response may arrive before the listener is registered
await page.getByTestId("login-submit").click();
const resp = await page.waitForResponse(...); // may miss the response
```

```typescript
// ✅ Correct — listener is registered first
const respPromise = page.waitForResponse(...); // register
await page.getByTestId("login-submit").click(); // trigger
await respPromise;                              // wait
```

### Auth helpers

`obra/e2e/helpers/auth.ts` exports ready-made waiters:

```typescript
import { waitForAuthToken, waitForAuthSignup } from "../helpers/auth.js";

// Login (POST /auth/v1/token)
const authDone = waitForAuthToken(page);
await page.getByTestId("login-submit").click();
await authDone;

// Register (POST /auth/v1/signup)
const signupDone = waitForAuthSignup(page);
await page.getByTestId("register-submit").click();
await signupDone;
```

### Edge Function calls

For Supabase Edge Functions, match on the function name in the URL:

```typescript
const indexDone = page.waitForResponse((resp) =>
  resp.url().includes("/functions/v1/ai-generate-index") &&
  resp.request().method() === "POST",
);
await page.getByTestId("generate-index-btn").click();
await indexDone;
// now the TOC is in the DOM — assert immediately
```

### URL changes driven by client-side routing

When there is no network call (e.g. the entitlement router redirects synchronously from local storage), `waitForURL` is acceptable — it is not a timeout but a navigation event:

```typescript
// No API call involved — pure client-side redirect
await page.goto("/app/dashboard");
await page.waitForURL(/\/login/);
```

### When a response check is not enough

If the UI update happens asynchronously after the response (e.g. a React state update renders new elements), wait on the observable DOM outcome directly instead of the intermediate response:

```typescript
// ✅ Espera el resultado visible — no el response intermedio
await page.getByTestId("register-submit").click();
await page
  .getByRole("heading", { name: /revisa tu correo/i })
  .waitFor(); // el heading aparece cuando el estado cambia
```

Si la respuesta y el DOM update son dos eventos distintos, se pueden encadenar:

```typescript
const indexDone = page.waitForResponse((r) => r.url().includes("/functions/v1/ai-generate-index"));
await page.getByTestId("generate-index-btn").click();
await indexDone;
await page.getByTestId("chapter-list").waitFor(); // espera el DOM separado de la red
```

**Regla:** esperá siempre lo más cercano al usuario posible. Si podés esperar un elemento visible, hacelo — es más robusto que esperar una respuesta HTTP que el usuario nunca ve.

---

## 3. AI call interception

All AI Edge Functions are intercepted automatically via the base test fixture. Tests that import from `../helpers/test-fixture.ts` get this for free:

```typescript
// obra/e2e/helpers/test-fixture.ts — already applied to every test
await interceptAiCalls(page); // registers routes for all AI functions
```

Fixture files live in `obra/e2e/fixtures/`. To intercept an additional function within a specific test:

```typescript
await page.route("**/functions/v1/export-pdf-queue", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, jobId: "test-job-id" }),
  }),
);
```

Pair interception with `waitForResponse` to know when the call completes:

```typescript
const exportDone = page.waitForResponse((resp) =>
  resp.url().includes("/functions/v1/export-pdf-queue"),
);
// intercept registered earlier ↑
await page.getByTestId("export-pdf-btn").click();
await exportDone;
await expect(page.getByTestId("export-success")).toBeVisible();
```

---

## 4. Test isolation — cleanup de datos creados

Cada test debe dejar la base de datos igual a como la encontró. Nunca dependas de datos de un test anterior.

### Regla

Si un test crea datos → declarar la variable de ID y el hook `test.afterEach` **en el scope del módulo** (fuera de cualquier `test()`). Así el cleanup corre incluso si el test falla.

**`test.afterEach()` no puede estar dentro de un `test()` — Playwright lanza un error en runtime.**

```typescript
// ✅ Correcto — hook y variable al nivel del módulo
let projectId: string | undefined;

test.afterEach(async () => {
  if (projectId) await deleteProjectById(projectId);
  projectId = undefined; // resetear para el próximo test
});

test("upload wizard happy path", async ({ page }) => {
  // El test asigna projectId cuando lo crea
  await page.waitForURL(/\/projects\/([^/]+)\/wizard/);
  projectId = page.url().match(/\/projects\/([^/]+)\//)?.[1];
  // ...
});
```

```typescript
// ❌ Incorrecto — test.afterEach() dentro de test() lanza:
// "Playwright Test did not expect test.afterEach() to be called here"
test("some test", async ({ page }) => {
  test.afterEach(async () => { ... }); // ← ERROR
});
```

### Helpers disponibles — `obra/e2e/helpers/db.ts`

Usan `SUPABASE_SERVICE_ROLE_KEY` del proceso Playwright (cargado desde `.env.e2e.local`). **Nunca** van al browser.

| Función | Qué hace |
|---|---|
| `findAuthUserByEmail(email)` | Devuelve el UUID del usuario auth, o `undefined` si no existe |
| `deleteAuthUser(userId)` | Borra el usuario por id (404 es silenciado) |
| `deleteAuthUserByEmail(email)` | find + delete; no-op si no existe |
| `createActiveProject(userId, name)` | Inserta un proyecto activo vía admin REST (bypasses RLS); devuelve el id |
| `deleteProjectById(projectId)` | Borra el proyecto por id via REST (cascada a ebooks, chapters, etc.) |
| `deleteProjectsByUserId(userId)` | Borra todos los proyectos de un usuario vía admin REST |

### Usuarios pre-sembrados (no necesitan cleanup)

Los usuarios creados por `npm run seed` son permanentes — no borrarlos en los tests:

| `testUser(...)` | Email | Suscripción |
|---|---|---|
| `testUser(1)` | `creator-seed-1@obratest.invalid` | `active` |
| `testUser(2)` | `creator-seed-2@obratest.invalid` | `active` |
| `testUser(3)` | `creator-seed-3@obratest.invalid` | `active` |
| `testUser('unsubscribed')` | `creator-seed-unsubscribed@obratest.invalid` | `none` |

---

## 5. Entorno local — Supabase local, no remoto

E2E siempre corre contra Supabase local (`supabase start`). Nunca contra el proyecto remoto.

### Cómo funciona

`npm run e2e` inicia el dev server con `vite --mode e2e`. Vite carga los archivos `.env` en este orden para el modo `e2e`:

```
.env              ← valores base (ignorado si el key ya está definido)
.env.local        ← NO cargado en modo e2e (Vite solo carga .env.<mode>.local)
.env.e2e          ← comprometido, defaults para todos
.env.e2e.local    ← gitignored, valores locales del desarrollador ← prioridad máxima
```

Esto significa que `npm run dev` (sin modo) sigue usando `.env.local` con el Supabase remoto, y `npm run e2e` usa `.env.e2e.local` con el local. Los dos entornos están completamente aislados.

### Setup inicial

```bash
# 1. Desde la raíz del repo
supabase start

# 2. Obtener las credenciales locales
supabase status
# anota: API URL, anon key, service_role key

# 3. Crear obra/.env.e2e.local (gitignored)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key de supabase status>
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role key de supabase status>
TEST_USER_PASSWORD=<contraseña para los usuarios de prueba>

# 4. Sembrar usuarios de prueba (primera vez o tras supabase db reset)
cd obra && npm run seed

# 5. Correr los tests
npm run e2e          # headless
npm run e2e:headed   # ver el browser
npm run e2e:ui       # UI mode de Playwright
```

`playwright.config.ts` ya carga `.env.e2e.local` para el proceso Playwright (para `SUPABASE_SERVICE_ROLE_KEY`, `TEST_USER_PASSWORD`, etc.). Vite lo carga por `--mode e2e` para las vars `VITE_*` que necesita el browser.

### Puerto 5173 ocupado al abrir la UI

`playwright.config.ts` tiene `reuseExistingServer: false`. Si `npm run dev` está corriendo en el puerto 5173, la UI de Playwright no puede arrancar su propio servidor y no muestra ningún test. Solución: matar el proceso antes de abrir la UI.

```bash
# Ver qué proceso ocupa 5173
lsof -i :5173

# Matarlo
kill <PID>

# Recién entonces abrir la UI
npm run e2e:ui
```

---

## 6. Qué mockear y qué dejar real

Regla general: **mockear todo lo que consuma créditos de IA o dependa de servicios externos**. Dejar real lo que testea integración DB + Edge Function sin IA.

| Edge Function | ¿Mockear? | Razón |
|---|---|---|
| `ai-optimize` | ✅ Sí | Llama a Claude — consume créditos |
| `ai-generate-index` | ✅ Sí | Llama a Claude |
| `ai-generate-all-bonus-index` | ✅ Sí | Llama a Claude |
| `ai-generate-content` | ✅ Sí | Llama a Claude |
| `ai-split-proposal` | ✅ Sí | Llama a Claude |
| `image-generate` | ✅ Sí | Llama a Gemini |
| `generate-document-template` | ✅ Sí | Genera HTML pesado |
| `export-pdf-queue` | ✅ Sí | Encola job en Railway — no hay Railway en E2E |
| `manuscript-upload-parse` | ❌ No | Sin IA — testea parsing real del .docx y Storage |
| `approve-alignment` | ❌ No | Sin IA — crea rows de chapters reales en la DB |

Las funciones mockeadas se registran automáticamente desde `test-fixture.ts` vía `interceptAiCalls(page)`. Las por-test (como `export-pdf-queue`) se registran con `page.route()` dentro del test.

---

## 7. Requests auto-disparadas por estado de React

Algunos edge functions no se disparan por un click del usuario sino por un `useEffect` que reacciona al estado (e.g. `autoStart` en `ContentUploadAlignmentPanel`). El patrón es el mismo — registrar el `waitForResponse` **antes de la acción que inicia la cadena** — pero la cadena puede ser más larga:

```
setInputFiles → manuscript-upload-parse → [React state update]
  → ContentUploadAlignmentPanel mounts → ai-split-proposal (auto)
```

```typescript
// ✅ Registrar AMBOS waiters antes de setInputFiles
const splitProposalDone = page.waitForResponse(
  (r) => r.url().includes("/functions/v1/ai-split-proposal"),
);
const parseDone = page.waitForResponse(
  (r) => r.url().includes("/functions/v1/manuscript-upload-parse"),
);

await fileInput.setInputFiles(MANUSCRIPT_PATH);
await parseDone;          // parse terminó
await splitProposalDone;  // auto-trigger terminó
```

Si `splitProposalDone` nunca resuelve, el problema suele estar en el estado intermedio (React no montó el componente que dispara la llamada). Agregar un `waitFor` sobre el elemento que confirma que el componente montó da un error más claro:

```typescript
// Diagnosica si ContentUploadAlignmentPanel montó
await page.getByTestId("alignment-generating").waitFor({ state: "visible", timeout: 10_000 });
await splitProposalDone;
```
