# PRD — Obra
**Producto:** obra.app  
**Versión:** 1.0  
**Fecha:** Marzo 2026  
**Estado:** Draft para revisión  

---

## 1. Visión del producto

**Obra** es una plataforma SaaS que permite a creadores de infoproductos en LATAM y Brasil generar proyectos completos de venta digital — ebook principal, bonuses, order bumps y landing page para Shopify — usando inteligencia artificial, con control total sobre diseño, imágenes y contenido, y exportación lista para publicar.

### Problema que resuelve

Las herramientas existentes (Gamma, Canva, Adoptimizer) están pensadas para slides o diseño genérico. Ninguna entiende el flujo real de un infoproductor: crear un ebook en HTML con diseño profesional, generar los materiales de bonus, y levantar una landing page que funcione en Shopify con bloques liquid separados. El proceso actual es manual, lento y requiere conocimientos técnicos.

### Propuesta de valor única

> "De la idea al infoproducto completo listo para vender en Shopify, en minutos, con IA — sin saber diseño ni código."

**Dominio:** obra.app  
**Idiomas:** Español (LATAM) · Portugués (BR)

### Diferenciadores clave vs competencia

| Feature | Gamma | Canva | Obra |
|---|---|---|---|
| Salida en HTML/PDF profesional | ❌ | ❌ | ✅ |
| Proyecto completo (ebook + landing + bonuses) | ❌ | ❌ | ✅ |
| Bloques liquid para Shopify | ❌ | ❌ | ✅ |
| Sistema de diseño 60/30/10 por proyecto | ❌ | Parcial | ✅ |
| Generación + swap de imágenes con IA | ✅ | Parcial | ✅ |
| Pensado para infoproductores LATAM | ❌ | ❌ | ✅ |

---

## 2. Usuarios objetivo

### Mercado primario
- Creadores de infoproductos en LATAM y Brasil
- Idiomas: Español (LATAM) y Portugués (BR)
- Plataforma de venta principal: Shopify

### Perfil de usuario principal — "Valentina"
- Mujer, 28–42 años, LATAM o mercado hispano de USA
- Quiere generar ingresos desde casa con conocimientos propios
- Tiene contenido o expertise pero no sabe diseñar ni programar
- Frustrada con herramientas genéricas que no entienden su flujo
- Necesita un sistema completo A-Z, no tutoriales sueltos
- Miedos: que quede amateur, que tarde demasiado, que no sepa usarlo

### Perfil secundario
- Freelancers o agencias que crean infoproductos para clientes
- Creadores con experiencia que quieren acelerar su producción

---

## 3. Estructura de un "Proyecto"

Un proyecto en InfoProduct OS es la unidad mínima de trabajo y contiene:

```
PROYECTO
├── 📘 Ebook principal
│   ├── Contenido (AI-generated o ingresado por usuario)
│   ├── Diseño (paleta 60/30/10 + tipografías)
│   └── Imágenes (AI-generated, intercambiables)
│
├── 🎁 Bonuses (1 a N)
│   └── Mismo sistema de diseño que el ebook principal
│
├── ⚡ Order Bumps (1 a N)
│   └── Mismo sistema de diseño que el ebook principal
│
└── 🛒 Landing Page para Shopify
    ├── Vista previa completa
    └── Bloques liquid separados (copiables individualmente)
```

### Bloques de landing page (estructura estándar)
1. Hero / Promesa principal
2. Dolores / Problemas del avatar
3. Beneficios (qué vas a lograr)
4. Solución / Presentación del producto
5. Bonuses
6. Precio / CTA con urgencia (opción de contador de tiempo regresivo)
7. Garantía
8. Testimonios (placeholder si no tiene)
9. FAQs
10. Mini historia del autor (opcional, activable por el usuario)

Cada bloque es independiente y exportable como sección liquid de Shopify.

---

## 4. Flujos principales de usuario

### Flujo A — Creación con IA desde cero (onboarding wizard)

```
1. Usuario crea nuevo proyecto
2. Wizard guiado paso a paso — cada campo tiene asistencia de IA:
   - ¿Cuál es el tema de tu infoproducto?
   - ¿Quién es tu cliente ideal (avatar)?
   - ¿Qué problema resuelve?
   - ¿Qué incluye? (ebook, bonuses, order bumps, etc.)
   - ¿Tenés preferencia de estilo visual?

   → En CADA paso: el usuario puede escribir algo básico o incompleto
     y la IA lo optimiza/completa de forma profesional en tiempo real.
     Ejemplo: escribe "mujeres que quieren hacer velas" y la IA lo
     expande a un avatar completo con demografía, dolores y deseos.

3. IA genera propuesta completa:
   - Título + subtítulo del ebook
   - Índice de capítulos
   - Contenido de cada capítulo
   - Paleta de colores (60/30/10)
   - Par tipográfico
   - Imágenes para cada sección
4. Usuario revisa y aprueba / edita por sección
5. IA genera HTML del ebook
6. Usuario itera sobre el HTML hasta que le guste (sin límite de iteraciones)
7. Usuario exporta PDF / genera landing
```

### Flujo B — Transformar contenido existente

```
1. Usuario crea nuevo proyecto
2. Elige cómo ingresar su contenido:
   - Pega texto / outline directamente
   - Sube un archivo .docx o .pdf
3. IA analiza y propone:
   - Estructura de capítulos reorganizada
   - Título optimizado para venta
   - Gaps de contenido para completar
   - Paleta y tipografías sugeridas
4. Mismo wizard que Flujo A — con asistencia IA en cada paso
5. Continúa igual que Flujo A desde paso 4
```

### Flujo C — Editor de proyecto existente (iteración)

```
1. Usuario entra a proyecto guardado
2. Puede editar por sección:
   - Cambiar imagen (regenerar con IA / subir propia)
   - Cambiar paleta de colores
   - Cambiar tipografías
   - Editar texto
   - Agregar/quitar capítulos
3. Vista previa en tiempo real del HTML generado
4. Iteración libre — el usuario puede pedir cambios hasta que le guste
   (sin límite de regeneraciones por sesión)
5. Re-exportar cuando esté conforme
```

---

## 5. Sistema de diseño por proyecto

### Regla 60/30/10 de color
- **60%** — Color dominante (fondos, áreas grandes)
- **30%** — Color secundario (secciones, cards)
- **10%** — Color acento (botones, highlights, iconos)

La app debe:
- Generar paleta automáticamente según el tema/nicho
- Permitir que el usuario elija manualmente con color picker
- Mostrar preview del 60/30/10 antes de aplicar
- Aplicar la misma paleta al ebook, bonuses y landing

### Tipografías
- Par tipográfico: display (títulos) + body (cuerpo)
- Fuentes: Google Fonts (gratuitas, cargables en HTML)
- La IA sugiere 3 opciones de par tipográfico
- El usuario puede elegir o pedir otras

### Aplicación consistente
- El sistema de diseño se define UNA vez por proyecto
- Se aplica automáticamente al ebook, todos los bonuses, order bump y landing
- Si el usuario cambia la paleta, se actualiza en todos los documentos del proyecto

---

## 6. Generación y gestión de imágenes

### Generación con IA
- Cada sección del ebook tiene una imagen asociada
- La IA genera imágenes coherentes con el tema y la paleta de colores
- Estilos disponibles: ilustración flat, fotografía, isométrico, minimalista, etc.

### Interacción del usuario con imágenes
- **Regenerar**: pedir a la IA una nueva versión ("más colorida", "sin personas", etc.)
- **Reemplazar**: subir imagen propia (JPG, PNG, WebP)
- **Eliminar**: quitar la imagen y dejar solo texto
- **Repositorio**: imágenes generadas quedan guardadas en el proyecto

### Proveedor de imágenes
- API: fal.ai o Replicate (Flux / SDXL)
- Resolución: mínimo 1200px de ancho
- Formato de salida: WebP optimizado

---

## 7. Exportación

### PDF (ebook, bonuses, order bump)
- Generado desde HTML vía Puppeteer (server-side)
- Tamaño: A4 o Letter (opción del usuario)
- Fonts embebidas
- Imágenes optimizadas
- Sin márgenes de browser (clean PDF)

### Landing Page para Shopify
- Vista previa completa dentro de la app
- Exportación como bloques liquid independientes
- Cada bloque es una sección de Shopify (`.liquid`)
- El usuario copia y pega cada bloque en su theme
- Incluye CSS embebido por bloque (no rompe el theme)
- Los bloques respetan la paleta de colores del proyecto

---

## 8. Features — MVP vs Futuro

### MVP (v1.0) — Lo que se lanza primero

| # | Feature | Prioridad |
|---|---|---|
| 1 | Registro/login (email + Google) | Alta |
| 2 | Crear proyecto nuevo | Alta |
| 3 | Wizard de onboarding con IA (Flujo A) | Alta |
| 4 | Ingreso de contenido propio (Flujo B) | Alta |
| 5 | Generación de índice y contenido con IA | Alta |
| 6 | Sistema de diseño: paleta 60/30/10 + tipografías | Alta |
| 7 | Generación de imágenes por sección | Alta |
| 8 | Swap de imagen (regenerar con IA / subir propia) | Alta |
| 9 | Editor por sección (texto, imagen, diseño) | Alta |
| 10 | Vista previa del ebook en tiempo real | Alta |
| 11 | Exportación PDF (ebook) | Alta |
| 12 | Generación de landing page con bloques liquid | Alta |
| 13 | Dashboard de proyectos | Media |
| 14 | Soporte ES (LATAM) + PT (BR) | Media |

### Post-MVP (v1.x — v2.0)

| Feature | Versión estimada |
|---|---|
| Bonuses y order bump | v1.1 |
| Exportación HTML descargable | v1.1 |
| Templates prediseñados por nicho | v1.2 |
| Historial de versiones por proyecto | v1.2 |
| Colaboración (compartir proyecto) | v2.0 |
| Integración directa con Shopify API | v2.0 |
| Generación de secuencia de emails de lanzamiento | v2.0 |

---

## 9. Stack técnico

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | React + Vite + TypeScript | Moderno, rápido, amplio soporte en Cursor |
| UI Components | shadcn/ui + Tailwind CSS | Componentes accesibles y customizables |
| Backend / BaaS | Supabase | Auth, DB, Storage, Edge Functions — todo en uno |
| Base de datos | PostgreSQL (via Supabase) | Relacional, robusto, gratuito al inicio |
| AI — Texto | Anthropic Claude API (claude-sonnet) | Mejor para generación de contenido estructurado |
| AI — Imágenes | fal.ai (Flux) | Rápido, buena calidad, API simple |
| Parsing de docs/PDF | pdf-parse + mammoth | Extracción de contenido de archivos subidos por el usuario |
| PDF Generation | Puppeteer (via Edge Function) | Server-side, clean output |
| Internacionalización | i18next | Soporte ES/PT |
| Deploy Frontend | Vercel | CI/CD automático, gratis al inicio |
| Deploy Backend | Supabase hosted | Incluido en el plan |
| Editor de código | Cursor | Desarrollo asistido por IA |

---

## 10. Arquitectura de datos (entidades principales)

```
users
  id, email, name, plan, created_at

projects
  id, user_id, name, status, language, created_at, updated_at

design_system
  id, project_id
  color_primary, color_secondary, color_accent
  font_display, font_body

ebooks
  id, project_id, type (main|bonus|order_bump)
  title, subtitle, target_avatar
  index (JSON array de capítulos)

chapters
  id, ebook_id, order, title, content_html, image_url

landing_pages
  id, project_id
  blocks (JSON array de bloques)
  preview_html

images
  id, project_id, chapter_id (nullable)
  url, prompt_used, source (ai|upload)
```

---

## 11. Modelo de negocio

### Planes de suscripción (borrador)

| Plan | Precio | Límites |
|---|---|---|
| Starter | ~$19/mes | 3 proyectos activos, 30 imágenes IA/mes |
| Pro | ~$49/mes | 15 proyectos activos, 150 imágenes IA/mes |
| Agency | ~$99/mes | Proyectos ilimitados, imágenes ilimitadas |

### Modelo de costos a considerar
- Claude API: ~$0.003 por 1K tokens (output)
- fal.ai imágenes: ~$0.003–0.01 por imagen
- Supabase: gratuito hasta 500MB DB / 1GB storage
- Vercel: gratuito en tier hobby

---

## 12. Lo que queda FUERA del MVP

- App mobile (solo web responsive)
- Editor drag & drop visual (WYSIWYG)
- Integración directa con Shopify API (se exportan bloques, no se publica automático)
- Generación de videos o audio
- Marketplace de templates de pago
- Multi-usuario por cuenta (teams)
- White label

---

## 13. Métricas de éxito (primeros 3 meses)

- 100 usuarios registrados en primer mes
- 30% conversión de free trial a pago
- Tiempo de creación de primer ebook completo < 20 minutos
- NPS > 40
- Churn mensual < 8%

---

## 14. Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Costos de API más altos de lo esperado | Media | Rate limiting por plan + caché de resultados |
| Calidad de imágenes IA inconsistente | Media | Permitir fácil regeneración y upload propio |
| Curva de aprendizaje del usuario | Baja | Wizard muy guiado + video onboarding |
| Competidor grande copia la idea | Baja | Velocidad de ejecución + comunidad LATAM |

---

*Documento generado como base para desarrollo. Próximo paso: documento de arquitectura técnica detallada.*
