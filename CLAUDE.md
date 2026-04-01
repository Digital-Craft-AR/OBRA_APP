# Obra.app — Project Context for Claude Code

## What is Obra
Obra (obra.app) is a SaaS platform for infoproduct creators in LATAM and Brazil.
It uses AI to generate complete digital product projects: ebooks, bonuses, order bumps,
and Shopify landing pages — targeting Spanish (LATAM) and Portuguese (BR) speakers.

## Tech Stack
- Frontend: React + Vite + TypeScript
- UI: shadcn/ui + Tailwind CSS
- Backend: Supabase (auth, DB, storage, Edge Functions)
- AI: Claude API (content generation), fal.ai (image generation)
- PDF: Puppeteer
- Deployment: Vercel
- Version control: GitHub

## Supabase DB Tables (all with RLS policies)
- profiles (auto-created on signup via trigger)
- projects
- ebooks
- chapters
- design_systems
- landing_pages
- images
- Storage bucket: project-images

## Brand & Design System
CRITICAL: Always reference tokens.ts for styling. Never use generic colors.

Navy blue palette (base: #204970):
- Sidebar/navbar: obra-blue-900 (#204970) — flat, no gradient
- Main content background: white (#FFFFFF)
- Cards: white with border obra-blue-100 (#E8F0F7)
- CTA accent: obra-green-400 (#C8E62B)
- Text primary: obra-blue-950 (#0F2438)
- Text secondary: obra-neutral-600 (#5A7A94)

Typography:
- Display: Fraunces
- Body: Plus Jakarta Sans
- Minimum font size: 14px everywhere

Buttons (pill-shaped, border-radius: 9999px):
- On dark background → green button (#C8E62B) with dark text (#0F2438)
- On light background → blue button (#2D6499) with white text

Zero gradients anywhere in the app.

## Product Structure
Each project in Obra contains:
1. Ebook (main product)
2. Bonuses (1 to N)
3. Order bumps (1 to N)
4. Shopify landing page

## Landing Page Block Structure (in order)
1. Hero
2. Dolores (pain points)
3. Beneficios
4. Solución
5. Bonuses
6. Precio/CTA (optional countdown timer)
7. Garantía
8. Testimonios
9. FAQs
10. Mini historia del autor (optional)

## Creation Flows
1. AI Wizard from scratch (4-step wizard — already built)
2. Paste/upload existing content

## Working Modules (already built)
- Auth: login/register via Supabase
- Dashboard with project cards
- 4-step Wizard

## Key Rules for This Project
- ALWAYS import design tokens from src/lib/tokens.ts
- ALWAYS follow .cursorrules for styling decisions
- **Zero hardcoding — non negotiable:** Never hardcode colors, sizes, text strings, or styles inline. Every value must come from a token (tokens.ts), a component (src/components/ui/), or a translation key (i18n.ts). If the right abstraction doesn't exist yet, create it first.
- Every prompt must reference the design system explicitly
- Business model: freemium → subscription
- Primary markets: LATAM (Spanish) and Brazil (Portuguese)
- After completing any significant feature, design change, or architectural decision, update ESTADO_ACTUAL.md. This file is the single source of truth for the current state of the platform — not a changelog. It must always reflect what's built, what's in progress, and what's pending, with enough detail for design, frontend, and backend context.
- DOCUMENTATION RULE — Non negotiable:
  After every completed task update the relevant docs:
  - ESTADO_ACTUAL.md → always, every session
  - CLAUDE.md → when stack, design system or rules change
  - ARQUITECTURA_Obra.md → when DB or structure changes
  - PRD_Obra.md → when features or scope change
  - CONVENCIONES.md → when tokens or patterns change
  - ONBOARDING.md → when setup changes
- Never add styles to bare HTML element selectors (h1, h2, h3, p, a, input, button) in global CSS.
  All styling goes through Tailwind classes in components.
  Global CSS is only for: @theme tokens, :root CSS custom properties, font-face declarations,
  and box-sizing reset inside @layer base.
  Reason: In Tailwind v4, unlayered CSS rules beat @layer utilities regardless of specificity,
  so any bare element selector outside @layer base will silently override Tailwind utility classes.
