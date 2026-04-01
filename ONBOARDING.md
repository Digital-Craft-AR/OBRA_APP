# 🚀 Onboarding — Obra.app

Bienvenido al equipo. Este documento te pone al día con todo lo necesario para empezar a contribuir.

---

## 📖 Documentación esencial (leé en este orden)

1. **`PRD_Obra.md`** — Qué es Obra, para quién es, qué problema resuelve, y la visión del producto
2. **`ARQUITECTURA_Obra.md`** — Arquitectura técnica, decisiones de diseño, estructura de DB, integraciones
3. **`CLAUDE.md`** — Instrucciones para Claude Code (nuestro agente de desarrollo principal)
4. **`ESTADO_ACTUAL.md`** — Snapshot de qué está construido y qué falta
5. **`CONVENCIONES.md`** — Reglas de desarrollo y diseño aprendidas por experiencia

---

## 🛠 Setup local

### Prerrequisitos

- Node.js (v18+)
- npm
- Git
- VSCode (editor de código)
- Claude Code (herramienta principal de desarrollo)

### Pasos

```bash
# 1. Clonar el repo
git clone <URL_DEL_REPO>
cd Obra.app

# 2. Instalar dependencias (el código está dentro de /obra)
cd obra
npm install

# 3. Configurar variables de entorno
cp .env.local.example .env.local
# Completar las keys de Supabase (pedílas al equipo):
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY

# 4. Levantar el dev server
npm run dev
# La app corre en http://localhost:5173
```

### Claude Code

Claude Code es nuestra herramienta principal de desarrollo. No usamos Cursor ni GitHub Copilot.

```bash
# Abrir Claude Code siempre desde la raíz del proyecto
cd ~/Desktop/Obra.app/
claude --dangerously-skip-permissions
```

MCPs configurados:
- **supabase** — acceso directo a DB, migraciones, Edge Functions, logs
- **context7** — documentación actualizada de cualquier librería/framework

Skills instaladas:
- **ui-ux-pro-max** — diseño UI/UX con 67 estilos, 96 paletas, soporte React/Tailwind/shadcn
- **claude-api** — para builds con Claude API / Anthropic SDK
- **simplify** — review y cleanup de código

---

## 📁 Estructura del proyecto

```
Obra.app/                         ← Raíz (abrir Claude Code desde acá)
├── CLAUDE.md                     ← Instrucciones para Claude Code
├── PRD_Obra.md                   ← Product Requirements Document
├── ARQUITECTURA_Obra.md          ← Arquitectura técnica
├── ONBOARDING.md                 ← Este archivo
├── ESTADO_ACTUAL.md              ← Qué hay construido y qué falta
├── CONVENCIONES.md               ← Reglas de desarrollo y diseño
├── .claude/                      ← Config y skills de Claude Code
│   └── skills/
│       └── ui-ux-pro-max/        ← Skill de diseño UI/UX
│
└── obra/                         ← 🔥 Código fuente de la app
    ├── .env.local                ← Variables de entorno (NO commitear)
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── eslint.config.js
    ├── components.json           ← Config de shadcn/ui
    ├── index.html
    │
    └── src/
        ├── App.tsx               ← Router principal
        ├── main.tsx              ← Entry point
        ├── i18n.ts               ← Internacionalización (ES/PT)
        ├── index.css             ← Estilos globales + @theme con tokens
        │
        ├── lib/
        │   ├── tokens.ts         ← 🎨 Design tokens (FUENTE DE VERDAD)
        │   ├── supabase.ts       ← Cliente Supabase
        │   └── utils.ts          ← Utilidades generales
        │
        ├── providers/
        │   └── AuthProvider.tsx   ← Contexto de autenticación
        │
        ├── store/
        │   └── projectStore.ts   ← Estado global (Zustand)
        │
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── RegisterPage.tsx
        │   ├── DashboardPage.tsx
        │   ├── ProjectWizardPage.tsx
        │   └── ProjectEditorPage.tsx
        │
        ├── components/
        │   ├── ui/               ← Componentes base (Button, Card, Input, etc.)
        │   ├── auth/             ← AuthLayout
        │   ├── dashboard/        ← ProjectCard, EmptyProjectsState, NewProjectDialog
        │   └── routes/           ← ProtectedRoute, PublicOnlyRoute
        │
        └── assets/               ← Imágenes y recursos estáticos
```

---

## 🔧 Tech Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite + TypeScript |
| UI | shadcn/ui + Tailwind CSS v4 |
| State | Zustand |
| Backend | Supabase (auth, DB, storage, Edge Functions) |
| AI contenido | Claude API (Anthropic) — pendiente |
| AI imágenes | fal.ai — pendiente |
| PDF export | Puppeteer — pendiente |
| Deploy | Vercel |
| Control de versión | GitHub |

---

## 🎨 Paleta de colores actual

La app usa una paleta **azul navy + verde "tennis ball"**.

| Token | Hex | Uso |
|-------|-----|-----|
| `obra-blue-950` | `#0F2438` | Textos principales, color más oscuro |
| `obra-blue-900` | `#204970` | Sidebar (flat, sin gradiente) |
| `obra-blue-700` | `#2D6499` | Botones primary, links, acentos |
| `obra-blue-100` | `#E8F0F7` | Bordes de cards, badges |
| `obra-blue-50` | `#F4F8FC` | Fondos sutiles |
| `obra-green-400` | `#CCFF00` | CTAs, highlights, acento principal |
| Canvas | `#FFFFFF` | Fondo principal — blanco puro |

Fuente de verdad: **`src/lib/tokens.ts`**

---

## 🔄 Flujo de trabajo

1. **Abrí Claude Code** desde `~/Desktop/Obra.app/` con `claude --dangerously-skip-permissions`
2. **Describí lo que querés hacer** en lenguaje natural
3. **Revisá el resultado** en `http://localhost:5173`
4. **Iterá** con prompts de seguimiento si algo no quedó bien
5. **Commiteá y pusheá** cuando esté listo

### Tips para prompts en Claude Code

- Referenciá tokens por nombre: "usá `obra-blue-900` para el sidebar"
- Especificá fondo oscuro o claro (cambia el color de los botones)
- Si algo se rompió, describí qué ves vs qué esperabas
- Para features nuevas, referenciá el PRD: "según el PRD, el wizard necesita..."

---

## 🌐 Servicios y accesos

| Servicio | URL | Notas |
|----------|-----|-------|
| App local | http://localhost:5173 | `npm run dev` desde `/obra` |
| Supabase Dashboard | https://supabase.com/dashboard | Pedí acceso al proyecto |
| Vercel | https://vercel.com | Deploy automático |
| GitHub | (repo URL) | Pedí acceso como collaborator |

---

## ❓ Dudas frecuentes

**¿Puedo usar Cursor?**
No. Usamos Claude Code para desarrollo y VSCode como editor de código.

**¿Dónde están las reglas de diseño?**
En `src/lib/tokens.ts` (tokens), `CLAUDE.md` (instrucciones para el agente), y `CONVENCIONES.md`.

**¿Cómo agrego un componente de shadcn/ui?**
```bash
npx shadcn-ui@latest add <componente>
```

**¿Cómo veo la base de datos?**
Desde el Supabase Dashboard, o usando el MCP de supabase en Claude Code.

---

## ⚠️ Notas sobre docs existentes

Los archivos `PRD_Obra.md` y `ARQUITECTURA_Obra.md` fueron escritos al inicio del proyecto y tienen algunas referencias desactualizadas (mencionan Cursor, `.cursorrules`, y la paleta púrpura anterior). La fuente de verdad actual es siempre `tokens.ts` para colores y este conjunto de docs (`ONBOARDING`, `ESTADO_ACTUAL`, `CONVENCIONES`) para el estado del proyecto.
