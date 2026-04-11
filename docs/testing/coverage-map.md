# Critical-Path Coverage Map

**Generated:** 2026-04-11  
**Test runner:** Vitest  
**Total existing test files:** 21

This document inventories high-risk modules against existing `*.test.*` files and calls out gaps. Each uncovered gap links to a follow-up issue or states an explicit deferral reason.

---

## Coverage status key

| Symbol | Meaning |
|---|---|
| ✅ | Tests present and cover the main logic paths |
| ⚠️ | Tests present but coverage is partial / edge cases missing |
| ❌ | No tests |

---

## Auth

| Module | File | Status | Gap / Follow-up |
|---|---|---|---|
| OAuth callback errors | `auth/oauthCallbackErrors.ts` | ✅ | — |
| Registration errors | `auth/registerErrors.ts` | ✅ | — |
| Auth context | `auth/authContext.tsx` | ❌ | `useAuth` throws when used outside provider — deferred (simple, low-risk logic) |
| Auth provider | `auth/AuthProvider.tsx` | ❌ | Session subscription + onAuthStateChange — deferred (requires Supabase mock at module level) |
| Email verification resend | `auth/useEmailVerificationResend.ts` | ❌ | Deferred — straightforward hook; add when touched |
| Login page | `pages/LoginPage.tsx` | ✅ | Integration test added in Wave C |
| Register page | `pages/RegisterPage.tsx` | ✅ | — |
| Auth callback page | `pages/AuthCallbackPage.tsx` | ✅ | — |

---

## Entitlement / Credits / Payments

| Module | File | Status | Gap / Follow-up |
|---|---|---|---|
| Resolve entitlement | `entitlement/resolveEntitlement.ts` | ✅ | — |
| Checkout return | `entitlement/checkoutReturn.ts` | ✅ | — |
| Credit ledger | `lib/creditLedger.ts` | ✅ | — |
| Payment return params | `lib/paymentReturnParams.ts` | ✅ | — |
| Auth email entitlement | `lib/authEmailEntitlement.ts` | ✅ | — |
| MP signature | `lib/mpSignature.ts` | ✅ | — |
| Checkout edge errors | `lib/checkoutEdgeErrors.ts` | ❌ | Deferred — small utility; add when touched |
| Entitlement provider | `entitlement/EntitlementProvider.tsx` | ❌ | Context + Supabase subscription — deferred; add in a dedicated integration follow-up |

---

## Wizard — Structure

| Module | File | Status | Gap / Follow-up |
|---|---|---|---|
| Structure persistence | `lib/wizard/structurePersistence.ts` | ❌ | Deferred — complex Supabase calls; candidate for MSW integration test |
| Structure types | `lib/wizard/structureTypes.ts` | ❌ | Pure type file — no tests needed |
| AI optimize | `lib/wizard/aiOptimize.ts` | ❌ | Deferred — AI edge-function call; add with MSW |
| Wizard structure flow hook | `hooks/wizard/useWizardStructureFlow.ts` | ❌ | High-risk 25 KB hook — follow-up issue needed |
| Wizard structure project hook | `hooks/wizard/useWizardStructureProject.ts` | ❌ | Deferred — add alongside `useWizardStructureFlow` |
| Wizard structure page | `pages/WizardStructurePage.tsx` | ❌ | Deferred — depends on hook coverage above |

---

## Wizard — Content

| Module | File | Status | Gap / Follow-up |
|---|---|---|---|
| Content index API | `lib/wizard/contentIndexApi.ts` | ✅ | — |
| Content navigation | `lib/wizard/contentNav.ts` | ✅ | — |
| Manuscript upload | `lib/wizard/manuscriptUpload.ts` | ✅ | — |
| Manuscript upload API | `lib/wizard/manuscriptUploadApi.ts` | ❌ | Deferred — HTTP calls; add with MSW |
| Wizard content page | `pages/WizardContentPage.tsx` | ❌ | Deferred — very large (55 KB); candidate for component-level integration tests |

---

## Content / Chapters

| Module | File | Status | Gap / Follow-up |
|---|---|---|---|
| Sanitize chapter HTML | `lib/sanitizeChapterHtml.ts` | ❌ | **Security-critical (XSS)** — tests added in Wave C (#142) |
| Chapter rich text editor | `components/obra/ChapterRichTextEditor.tsx` | ❌ | Deferred — Tiptap integration; add when component is stabilised |

---

## Projects & Dashboard

| Module | File | Status | Gap / Follow-up |
|---|---|---|---|
| Project dashboard utilities | `lib/projectDashboard.ts` | ❌ | `resolveProjectEditorPath`, `resolveProjectStatusLabelKey` — small pure functions; add when touched |
| New project page | `pages/NewProjectPage.tsx` | ✅ | — |
| Dashboard page | `pages/DashboardPage.tsx` | ❌ | Deferred — large (19 KB); add as integration test with MSW-mocked project list |

---

## i18n / UI Locale

| Module | File | Status | Gap / Follow-up |
|---|---|---|---|
| UI locale | `lib/uiLocale.ts` | ✅ | — |
| Support email / mailto | `lib/supportEmail.ts`, `lib/supportMailto.ts` | ✅ | — |
| Account deletion confirm | `lib/accountDeletionConfirm.ts` | ✅ | — |

---

## Summary

| Status | Count |
|---|---|
| ✅ Covered | 15 |
| ❌ No tests (deferred) | ~20 |
| ❌ No tests (security-critical, Wave C) | 1 (`sanitizeChapterHtml`) |

Priority for next sprint: `useWizardStructureFlow.ts` (high complexity), `EntitlementProvider.tsx`, `structurePersistence.ts`.
