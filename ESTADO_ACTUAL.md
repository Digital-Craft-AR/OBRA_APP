# 📊 Estado Actual — Obra.app

> Última actualización: 1 de Abril 2026

---

## ✅ Lo que está construido y funcionando

### Autenticación
- Login con email/password
- Register con email/password
- Rutas protegidas (`ProtectedRoute`) — redirige a login si no hay sesión
- Rutas públicas (`PublicOnlyRoute`) — redirige a dashboard si ya hay sesión
- `AuthProvider` con Supabase
- Creación automática de perfil en `profiles` al registrarse (trigger en Supabase)

### Dashboard
- Lista de proyectos con `ProjectCard`
- Estado vacío con `EmptyProjectsState`
- `NewProjectDialog` — botón que navega directo al wizard (no hay modal, decisión de UX)
- Referencia visual: Linear y Vercel
- Eliminar proyecto: ícono `Trash2` en cada card → modal de confirmación con `Button variant="destructive"`
- Selector de idioma de la UI en el sidebar footer: ES / EN / PT (controla `i18n.changeLanguage`)

### Wizard de creación (6 pasos — completo)
- Paso 1: Tema — textarea + chips de ejemplo + botón "Mejorar con IA"
- Paso 2: Avatar — textarea + chips de ejemplo + botón "Mejorar con IA"
- Paso 3: Estructura — problema + selector de capítulos (5/7/10/12) + estimación de páginas en tiempo real
- Paso 4: Contenido — 3 cards visuales: Generar con IA / Pegar contenido / Subir archivo
- Paso 5: Estilo — idioma (ES/PT) + tono (profesional/cercano/inspirador)
- Paso 6: Resumen — recap completo, título sugerido, estimación de páginas prominente, CTA "✨ Generar mi proyecto"

Al completar se guarda en Supabase (`projects` + `ebooks`) y redirige al dashboard.

### Design System (paleta actual: azul navy + verde tennis ball)

Toda la paleta vive en `src/lib/tokens.ts` y se expone como utilidades Tailwind via `@theme` en `index.css`.

| Token | Hex | Rol |
|-------|-----|-----|
| `obra-blue-950` | `#0F2438` | Texto principal |
| `obra-blue-900` | `#204970` | Sidebar — flat, sin gradiente |
| `obra-blue-700` | `#2D6499` | Botones primary, links |
| `obra-blue-100` | `#E8F0F7` | Bordes de cards |
| `obra-blue-50` | `#F4F8FC` | Fondos sutiles |
| `obra-green-400` | `#CCFF00` | CTAs, acento (tennis ball) |
| `obra-neutral-900` | `#0F2438` | Texto body |
| `obra-neutral-600` | `#5A7A94` | Texto secundario |
| `obra-neutral-400` | `#9CA3AF` | Placeholders |
| `obra-neutral-200` | `#DDE8F0` | Bordes de inputs |
| `obra-neutral-100` | `#F8FAFB` | Fondo de inputs |
| Canvas | `#FFFFFF` | Fondo principal — blanco puro |

Fonts: Fraunces (display/títulos) + Plus Jakarta Sans (body). Mínimo `text-sm` (14px).

Botones: pill shape (`rounded-full`), 3 variantes:
- **primary** → `obra-blue-700` con texto blanco (sobre fondo claro)
- **cta** → `obra-green-400` con texto `obra-blue-950` (call-to-action)
- **ghost** → transparente con texto `obra-blue-700`
- **destructive** → `red-500` con texto blanco (eliminar/peligro)

Zero gradientes en toda la app.

### Componentes UI base
Button, Card, Input, Label, Badge, Dialog, DropdownMenu, Select, Separator, Avatar

### Supabase (DB)
- Tablas: `profiles`, `projects`, `ebooks`, `chapters`, `design_systems`, `landing_pages`, `images`
- RLS policies activas en todas las tablas
- Storage bucket: `project-images`

### Routing
| Ruta | Página |
|------|--------|
| `/` | Redirige a `/dashboard` |
| `/login` | `LoginPage` |
| `/register` | `RegisterPage` |
| `/dashboard` | `DashboardPage` |
| `/projects/new/wizard` | `ProjectWizardPage` |
| `/projects/:id/wizard` | `ProjectWizardPage` |
| `/projects/:id/editor` | `ProjectEditorPage` |

### Internacionalización
- `i18n.ts` configurado (español y portugués)

---

## 🚧 En progreso / Próximos pasos

### Editor de proyecto (`/projects/:id/editor`)
- Actualmente es un placeholder ("Próximamente")
- Es el siguiente módulo grande a construir
- Debe permitir ver y editar el ebook generado, bonuses, order bumps y landing page
- Depende de implementar la generación real con Claude API en el submit del wizard

---

## 📋 Pendiente (backlog)

| Feature | Descripción | Dependencia |
|---------|-------------|-------------|
| Google Login | Auth con Google OAuth | Supabase config |
| Editor de proyecto | Editor real de ebook, bonuses, order bumps, landing page | Wizard completo |
| Generación de contenido | Crear contenido de ebooks con Claude API | Claude API config |
| Generación de imágenes | Portadas y gráficos con fal.ai | fal.ai API |
| Export PDF | Generar PDFs descargables con Puppeteer | Editor completo |
| Landing page builder | Bloques: Hero, Dolores, Beneficios, Countdown, etc. | Editor completo |
| Sistema de créditos | Freemium + subscription, lógica de uso por modelo | Definir modelo de negocio |

---

## ⚠️ Bugs conocidos y regresiones recurrentes

| Problema | Descripción | Cómo prevenirlo |
|----------|-------------|-----------------|
| Main content se oscurece | El área principal de contenido pierde su fondo blanco | En todo prompt, reforzar: "sidebar `obra-blue-900`, main content `bg-white`" |
| Gradientes fantasma | Aparecen gradientes en el sidebar que no deberían existir | Reforzar: "sidebar flat, sin gradiente, un solo color `#204970`" |

---

## 🏗 Estructura del producto (lo que se genera por proyecto)

Cada proyecto en Obra genera:
- **Ebook principal** (guía/manual/ebook)
- **Bonuses** (1 a N documentos adicionales)
- **Order bumps** (1 a N productos complementarios)
- **Landing page en Shopify** con bloques específicos:
  - Hero
  - Dolores del avatar
  - Beneficios
  - Contenido del producto
  - Testimonios
  - Countdown timer
  - Historia del autor (opcional)
  - CTA de compra
