# 📐 Convenciones — Obra.app

> Reglas de desarrollo y diseño aprendidas por experiencia. Leer antes de tocar código.

---

## 🎨 Design System

### Paleta: Azul navy + Verde tennis ball

| Token | Hex | Uso |
|-------|-----|-----|
| `obra-blue-950` | `#0F2438` | Texto principal, color más oscuro |
| `obra-blue-900` | `#204970` | Sidebar — flat, sin gradiente |
| `obra-blue-700` | `#2D6499` | Botones primary, links, acentos |
| `obra-blue-100` | `#E8F0F7` | Bordes de cards, badges default |
| `obra-blue-50` | `#F4F8FC` | Fondos sutiles |
| `obra-green-400` | `#CCFF00` | CTAs, highlights, acento principal |
| `obra-neutral-900` | `#0F2438` | Texto body |
| `obra-neutral-600` | `#5A7A94` | Texto secundario, captions |
| `obra-neutral-400` | `#9CA3AF` | Placeholders |
| `obra-neutral-200` | `#DDE8F0` | Bordes de inputs |
| `obra-neutral-100` | `#F8FAFB` | Fondo de inputs |

**Fuente de verdad:** `src/lib/tokens.ts` — siempre consultalo antes de usar un color.

### Regla absoluta: Zero hardcoding

> Todo valor debe venir de una abstracción. Si no existe, créala primero.

| Tipo de valor | Debe venir de |
|---------------|---------------|
| Color / tamaño / sombra | Token en `tokens.ts` → clase Tailwind `obra-*` |
| Componente UI | `src/components/ui/` (Button, Dialog, Card, etc.) |
| Texto visible | Clave en `src/i18n.ts` via `t('...')` |
| Valor de lógica | Constante o variable nombrada |

**Nunca:**
- Clases con hex directo: ~~`bg-[#204970]`~~
- Strings de UI fuera de i18n: ~~`<p>Eliminar</p>`~~
- Estilos inline ad-hoc que reinventan un componente existente
- Si el token/componente/clave no existe → crearlo, no saltarlo

Los tokens se exponen como utilidades Tailwind via `@theme` en `index.css`. Usá siempre las clases Tailwind (`bg-obra-blue-900`, `text-obra-green-400`), nunca hex codes directos.

### La regla sagrada: Sidebar dark / Main content white

```
┌──────────────┬────────────────────────────────────────────┐
│              │                                            │
│   SIDEBAR    │           MAIN CONTENT                     │
│              │                                            │
│  obra-blue   │    bg-white (#FFFFFF)                      │
│  -900        │                                            │
│  (#204970)   │    Blanco puro. Sin tinte.                 │
│              │    Feel Notion/Canva.                       │
│  FLAT.       │                                            │
│  Sin         │    Si se ve oscuro, algo se rompió.         │
│  gradiente.  │                                            │
│              │                                            │
└──────────────┴────────────────────────────────────────────┘
```

**Zero gradientes en toda la app.** El sidebar es un solo color flat `#204970`.

### Botones

- **Forma:** Pill shape siempre (`rounded-full` / `border-radius: 9999px`)
- **Solo 4 variantes — no se permiten otras:**

| Variante | Background | Texto | Hover | Uso |
|----------|-----------|-------|-------|-----|
| `primary` | `obra-blue-700` | blanco | `obra-blue-900` | Acciones principales sobre fondo claro |
| `cta` | `obra-green-400` | `obra-blue-950` | `brightness-105` | Call-to-action: "Crear", "Siguiente", "Generar" |
| `ghost` | transparente | `obra-blue-700` | `obra-blue-50` | Acciones secundarias, cancelar |
| `destructive` | `red-500` | blanco | `red-600` | Acciones de eliminación/peligro |

### Input (1 solo estilo en toda la app)

```
bg-obra-neutral-100 border border-obra-neutral-200 rounded-input
text-obra-neutral-900 placeholder:text-obra-neutral-400
focus:ring-2 focus:ring-obra-blue-700 focus:border-obra-blue-700
h-11 px-3 py-2 text-sm w-full
```

### Card (1 solo estilo + hover)

```
Base:  bg-white border border-obra-blue-100 rounded-card shadow-card
Hover: hover:border-obra-blue-700 hover:shadow-card-hover hover:-translate-y-1
```

### Badges (solo 2 variantes)

| Variante | Estilo | Uso |
|----------|--------|-----|
| `default` | `bg-obra-blue-100 text-obra-blue-700 rounded-pill` | Status, tags, contadores |
| `warning` | `bg-yellow-50 text-yellow-700 rounded-pill` | Alertas, estados pendientes |

### Tipografía

| Uso | Font | Clase |
|-----|------|-------|
| Títulos y display | Fraunces | `font-display` |
| Body y UI | Plus Jakarta Sans | `font-body` |

Jerarquía estricta:
| Nivel | Clase |
|-------|-------|
| Page title | `text-2xl font-display font-bold text-obra-blue-950` |
| Section title | `text-lg font-semibold text-obra-blue-950` |
| Body | `text-sm font-body text-obra-neutral-900` |
| Caption/meta | `text-xs text-obra-neutral-600` |

- **Tamaño mínimo:** `text-sm` (14px) para body — `text-xs` solo para captions

### Spacing

- Siempre múltiplos de **4px** usando la escala default de Tailwind
- **Prohibido:** valores arbitrarios con brackets como `p-[13px]` o `mt-[7px]`
- Tokens especiales definidos: `w-sidebar` (280px), `max-w-auth-card` (420px)

### Shadows

| Token | Uso |
|-------|-----|
| `shadow-card` | Cards en estado base |
| `shadow-card-hover` | Cards en hover |
| `shadow-sm` | Elementos sutiles |

### Opacidad

Usar sintaxis Tailwind `/`, nunca `rgba()`:
```
✅  white/50, obra-green-400/15, obra-blue-700/20
❌  rgba(255,255,255,0.5)
```

---

## 🛠 Desarrollo

### Herramientas

| Herramienta | Rol |
|-------------|-----|
| **Claude Code** | Herramienta principal de desarrollo. TODO se hace acá. |
| **VSCode** | Editor de código. Solo para leer/navegar archivos. |
| **Supabase Dashboard** | Administrar DB, auth, storage |
| **localhost:5173** | Revisar resultados después de cada cambio |

No usamos Cursor. No usamos GitHub Copilot.

### Prompts para Claude Code

**Hacer:**
- Referenciar tokens por nombre: "usá `obra-blue-900` para el sidebar"
- Especificar contexto de fondo: "este componente va sobre fondo claro"
- Referenciar el PRD: "según el PRD, el paso 4 del wizard es..."
- Describir el resultado esperado vs lo que se ve

**No hacer:**
- Poner hex codes sueltos: ~~"usá #204970"~~ → "usá `obra-blue-900`"
- Redefinir colores que ya existen en tokens
- Usar valores con brackets: ~~`p-[13px]`~~ → `p-3`
- Agregar gradientes a nada
- Agregar estilos a selectores HTML bare (h1, h2, p, a) en CSS global

### Regla CSS importante (Tailwind v4)

Nunca agregar estilos a selectores HTML bare (`h1`, `h2`, `p`, `a`, `input`, `button`) en el CSS global. En Tailwind v4, CSS sin `@layer` tiene prioridad sobre las utilidades, rompiendo todo silenciosamente.

CSS global solo para: `@theme` tokens, `:root` custom properties, `@font-face`, y `box-sizing` dentro de `@layer base`.

### Estructura de archivos

- **Páginas** → `src/pages/NombrePage.tsx`
- **Componentes UI base** → `src/components/ui/Nombre.tsx`
- **Componentes de feature** → `src/components/feature/Nombre.tsx`
- **Lógica de estado** → `src/store/nombreStore.ts` (Zustand)
- **Servicios/utils** → `src/lib/`

### shadcn/ui

```bash
npx shadcn-ui@latest add <componente>
```
Después customizar según el design system de Obra (tokens, colores, pill buttons, etc.)

---

## 🧠 Decisiones de producto tomadas

No cambiarlas sin consultar:

| Decisión | Razón |
|----------|-------|
| Se eliminó el selector Ebook/Guía/Manual | La distinción no era clara para los usuarios |
| "Nuevo proyecto" navega directo al wizard | No hay modal intermedio — el wizard ya cumple esa función |
| Main content blanco puro (no dark, no tintado) | Feel Notion/Canva, no crypto/tech |
| Sidebar flat sin gradiente | Decisión deliberada de simplificación visual |
| Wizard con resumen antes de generar | Patrón validado de Adoptimizer |
| El producto debe sentirse "mágico" | Cada paso debe ser AI-driven, no un formulario estático |
| Paleta azul navy + verde tennis ball | Reemplazó la paleta púrpura + amarillo original |

---

## 🌍 Internacionalización

- La app soporta 3 idiomas de UI: español (`es`), inglés (`en`) y portugués (`pt`)
- Config en `src/i18n.ts` — los 3 idiomas están completos
- El selector de idioma vive en el sidebar footer del dashboard
- Todos los textos visibles al usuario deben usar el sistema de i18n — nunca strings hardcodeados
