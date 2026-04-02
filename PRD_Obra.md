# PRD — Obra

**Producto:** obra.app  
**Versión:** 1.0  
**Fecha:** Marzo 2026  
**Estado:** Draft para revisión  

---

## 1. Visión del producto

**Obra** es una plataforma SaaS que permite a creadores de infoproductos generar proyectos de venta digital — ebook principal, bonuses y order bumps — usando inteligencia artificial, con control total sobre diseño, imágenes y contenido, y exportación PDF lista para publicar. **Lanzamiento inicial: Argentina y Brasil** (ampliación del resto de LATAM posterior). **No es foco del MVP** dónde o cómo el usuario vende el producto en internet (p. ej. muchas infoproductoras usan **Shopify**); integración o material específico para esa venta se aborda **post-MVP** (ver landing liquid).

### Problema que resuelve

Las herramientas existentes (Gamma, Canva, Adoptimizer) están pensadas para slides o diseño genérico. Ninguna entiende el flujo real de un infoproductor: crear un ebook en HTML con diseño profesional, generar bonuses y order bumps coherentes con el mismo sistema de diseño, y exportar todo en PDF. El proceso actual es manual, lento y requiere conocimientos técnicos. La **página de venta online** del producto es otro trabajo; Obra **no prioriza** ese canal en el MVP (p. ej. tiendas tipo Shopify entran en post-MVP).

### Propuesta de valor única

> "De la idea al paquete de infoproducto (ebook + bonuses + bumps) exportable en PDF, en minutos, con IA — sin saber diseño ni código."

**Dominio:** obra.app  
**Idiomas:** la **interfaz** solo **es** y **pt-BR**; el **idioma de salida** del infoproducto lo fija cada **proyecto** (`es`, `pt-BR`, `en-US`, `en-GB`). Ver §2.

### Diferenciadores clave vs competencia


| Feature                                       | Gamma | Canva   | Obra |
| --------------------------------------------- | ----- | ------- | ---- |
| Salida en HTML/PDF profesional                | ❌     | ❌       | ✅    |
| Paquete coherente (ebook + bonuses + bumps, mismo diseño) | ❌     | ❌       | ✅    |
| Material de venta para tienda online (p. ej. liquid / Shopify) | ❌     | ❌       | ✅ (post-MVP) |
| Sistema de diseño 60/30/10 por proyecto       | ❌     | Parcial | ✅    |
| Generación + swap de imágenes con IA          | ✅     | Parcial | ✅    |
| Pensado para infoproductores LATAM            | ❌     | ❌       | ✅    |


---

## 2. Usuarios objetivo

### Mercado primario

- **Lanzamiento v1.0:** creadores de infoproductos en **Argentina** y **Brasil** (checkout y facturación acordes a esos mercados).
- **Canal de venta del infoproducto** (p. ej. Shopify u otra tienda): **fuera de alcance e interés del MVP**; no se integra ni se documenta como flujo prioritario hasta post-MVP. **No confundir** con el **pago de la suscripción a Obra** (Mercado Pago).
- Ampliación a otros países de LATAM: prevista tras validar el lanzamiento inicial.

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

### Idioma de la interfaz y del proyecto

- **Interfaz (UI):** solo **español** y **portugués (Brasil) — `pt-BR`**. El usuario puede **cambiar el idioma de la app** en cualquier momento; la preferencia se **persiste en el perfil de cuenta** (`ui_locale`).
- **Salida del proyecto (contenido generado):** un campo **`content_locale`** (código del **catálogo i18n** de producto) define el idioma de **toda** la generación: texto, HTML, PDFs, textos en imágenes si aplica. Se elige **al crear el proyecto** y **no se puede modificar** después; para entregar en otro idioma, **nuevo proyecto**.
- **Catálogo i18n de salida:** distinto del par UI es/pt-BR. En v1.0 el proyecto puede fijar **`content_locale`** entre: **`es`** (español), **`pt-BR`**, **`en-US`** (inglés EE. UU.) y **`en-GB`** (inglés Reino Unido; código BCP 47 estándar — no usar `en-UK`). Se pueden **ampliar** más locales después.
- **Mezcla:** es válido usar la UI en un idioma y generar el infoproducto en otro (p. ej. UI en español, proyecto en portugués).
- **Prompts del usuario vs salida:** el usuario puede escribir en **cualquier idioma**; la IA **produce** siempre según **`content_locale` del proyecto** (los prompts de sistema en backend siguen las convenciones técnicas del repositorio).

---

## 3. Estructura de un "Proyecto"

Un proyecto en Obra es la unidad mínima de trabajo y contiene:

```
PROYECTO (MVP) — límites v1.0 (ver §11)
├── 📘 Ebook principal (exactamente 1 por proyecto)
│   ├── Contenido (AI-generated o ingresado por usuario)
│   ├── Diseño (paleta 60/30/10 + tipografías)
│   └── Imágenes (AI-generated, intercambiables)
│
├── 🎁 Bonuses (hasta 5)
│   └── Mismo sistema de diseño que el ebook principal
│
└── ⚡ Order Bumps (hasta 2)
    └── Mismo sistema de diseño que el ebook principal

Cuenta (v1.0): hasta **20 proyectos activos** por usuario; **archivados ilimitados**; eliminación con **30 días** en DB/Storage antes de borrado definitivo (ver §11)

Post-MVP
└── 🛒 Landing Page para Shopify
    ├── Vista previa completa
    └── Bloques liquid separados (copiables individualmente)
```

### Bloques de landing page (estructura estándar — post-MVP)

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
   - Título + subtítulo del ebook principal
   - Índice y contenido por capítulo (ebook principal; bonuses y order bumps según lo definido en el wizard)
   - Paleta de colores (60/30/10)
   - Par tipográfico
   - Imágenes para cada sección relevante
4. Usuario revisa y aprueba / edita por sección
5. IA genera HTML del ebook
6. Usuario itera sobre el HTML hasta que le guste (cada acción de IA consume créditos; ver §11)
7. Usuario exporta PDF: **un archivo PDF por ebook** (principal, cada bonus, cada bump); puede descargar uno o **empaquetar todos en un ZIP** (MVP deseable)
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

### Importación de archivos (Flujo B) — reglas MVP

- **Formatos:** `.docx` estándar y **PDF con texto seleccionable** (capa de texto real). **No** se soporta en v1.0: PDF escaneado o basado solo en imagen; **OCR** queda **post-MVP** si se prioriza.
- **Tamaño máximo por archivo:** **10 MB** (`.docx` y `.pdf`). Un ebook mayormente texto rara vez lo supera; si lo hace, el usuario puede reducir peso o usar “pegar texto”. El tope se puede revisar con datos reales.
- **Un archivo por intento:** en cada importación, **un solo archivo** por pasada (no múltiples PDFs a la vez en el MVP).
- **PDF con contraseña / cifrado:** **rechazar** con mensaje claro; sugerir exportar sin contraseña o pegar el contenido.
- **Extracción vacía o inválida:** mensaje explícito y opción de **reintentar** con otro archivo o **pegar texto** manualmente.

### Flujo C — Editor de proyecto existente (iteración)

```
1. Usuario entra a proyecto guardado
2. Navega entre ebook principal, bonuses y order bumps (mismo sistema de diseño)
3. Puede editar por sección:
   - Cambiar imagen (regenerar con IA / subir propia)
   - Cambiar paleta de colores
   - Cambiar tipografías
   - Editar texto
   - Agregar/quitar capítulos
4. Vista previa en tiempo real del HTML generado por ebook activo
5. Iteración según créditos disponibles — cada generación u optimización con IA descuenta del saldo mensual
6. Re-exportar PDF cuando esté conforme: **un PDF por ebook**; opción **“Descargar todo (ZIP)”** con todos los PDFs del proyecto
```

### Accesibilidad (baseline v1.0)

- **Objetivo:** cumplir **WCAG 2.1 nivel A** en la aplicación web; aspirar a **nivel AA** en flujos críticos: **registro/login**, **wizard de onboarding**, **checkout/pagos** (Mercado Pago embebido o redirección según integración), **exportación** y **ajustes de cuenta** (exportar datos / eliminar cuenta).
- **Teclado:** todas las acciones principales utilizables **sin ratón**; orden de tabulación coherente con el flujo; en **diálogos modales** (confirmaciones, errores) **trampa de foco** y cierre con **Escape** donde el componente lo permita.
- **Formularios y wizard:** cada control con **etiqueta** visible o asociada; mensajes de validación y error **no** dependen solo del color; cuando la IA **complete u optimice** un campo, el cambio relevante se comunica de forma perceptible (p. ej. `aria-live` **polite**, sin inundar al usuario).
- **Contenido generado (PDF/HTML del infoproducto):** en v1.0 **no** se exige PDF/UA ni HTML semántico “a prueba de lectores de pantalla” para los entregables al cliente final; prioridad es calidad visual y coherencia del paquete. Mejoras de accesibilidad del **artefacto exportado** quedan **post-MVP** si hay demanda.
- **Pruebas:** el guion de **smoke manual** (ver §16) incluye al menos **un recorrido solo con teclado** del wizard (avanzar, retroceder, editar campo, disparar asistencia IA si está en el guion).

### Rendimiento percibido (v1.0) — modelo B

- **Objetivo:** la app debe sentirse **rápida y predecible** en uso normal; **no** se fija un SLA numérico al usuario final en v1.0. Orientación interna: revisar **Core Web Vitals** en rutas clave (**login/dashboard**, **wizard**, **editor**) con **Lighthouse** o **Vercel Speed Insights** (si está habilitado) de forma **periódica o antes de releases** mayores — umbrales **por acordar** con el equipo según dispositivos objetivo.
- **Carga inicial:** evitar **pantallas en blanco** prolongadas; **shell** o esqueleto visible enseguida; diferir trabajo no crítico (analytics, prefetch secundario) sin bloquear interacción.
- **Operaciones lentas (IA, PDF, importación):** **estados de carga** explícitos (spinner, barra, texto “generando…” / “exportando…”); **deshabilitar** acciones duplicadas mientras la petición está en curso; **errores** con opción de reintentar según §9.
- **Respuestas de IA:** si la plataforma lo permite sin comprometer costo ni complejidad, **streaming** del texto al usuario es **deseable** en wizard y editor; si no, bloques de texto que aparezcan al completar el tramo con feedback claro de progreso.
- **Activos:** imágenes en UI con **formato y tamaño** adecuados (p. ej. WebP donde aplique); el HTML/PDF del infoproducto sigue reglas de exportación del PRD (§7), distintas del shell de la app.

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
- Aplicar la misma paleta al ebook principal, bonuses y order bumps (y en post-MVP a la landing)

### Tipografías

- Par tipográfico: display (títulos) + body (cuerpo)
- Fuentes: Google Fonts (gratuitas, cargables en HTML)
- La IA sugiere 3 opciones de par tipográfico
- El usuario puede elegir o pedir otras

### Aplicación consistente

- El sistema de diseño se define UNA vez por proyecto
- Se aplica automáticamente al ebook principal, todos los bonuses y order bumps (y en post-MVP a la landing)
- Si el usuario cambia la paleta, se actualiza en todos los documentos del proyecto

---

## 6. Generación y gestión de imágenes

### Generación con IA

- Cada sección de cada ebook del proyecto (principal, bonus u order bump) puede tener una imagen asociada
- La IA genera imágenes coherentes con el tema y la paleta de colores
- Estilos disponibles: ilustración flat, fotografía, isométrico, minimalista, etc.

### Interacción del usuario con imágenes

- **Regenerar**: pedir a la IA una nueva versión ("más colorida", "sin personas", etc.)
- **Reemplazar**: subir imagen propia (JPG, PNG, WebP)
- **Eliminar**: quitar la imagen y dejar solo texto
- **Repositorio**: imágenes generadas quedan guardadas en el proyecto

### Proveedor de imágenes

- API: **Google Gemini API** — modelos de imagen **Nano Banana** (familia Gemini Image; ver docs de Google para el modelo concreto en producción)
- Resolución: mínimo 1200px de ancho
- Formato de salida: WebP optimizado

---

## 7. Exportación

### PDF (ebook, bonuses, order bump)

- **Un PDF por artefacto:** el ebook principal, cada bonus y cada order bump genera **su propio archivo PDF** (no un solo PDF fusionado). Así el usuario puede entregar archivos por separado como suele hacerse con infoproductos.
- **Descarga conjunta (MVP deseable):** acción para obtener **un ZIP** que incluya todos los PDFs del proyecto con nombres claros (p. ej. por título o tipo).
- Generado desde HTML vía Puppeteer (server-side)
- Tamaño: A4 o Letter (opción del usuario)
- Fonts embebidas
- Imágenes optimizadas
- Sin márgenes de browser (clean PDF)

### Landing Page para Shopify (post-MVP)

- Vista previa completa dentro de la app
- Exportación como bloques liquid independientes
- Cada bloque es una sección de Shopify (`.liquid`)
- El usuario copia y pega cada bloque en su theme
- Incluye CSS embebido por bloque (no rompe el theme)
- Los bloques respetan la paleta de colores del proyecto

---

## 8. Features — MVP vs Futuro

### MVP (v1.0) — Lo que se lanza primero


| #   | Feature                                          | Prioridad |
| --- | ------------------------------------------------ | --------- |
| 1   | Registro/login (email + Google); idioma de UI **es** / **pt-BR** persistido en perfil | Alta      |
| 2   | Crear proyecto nuevo con **`content_locale`** (idioma de toda la salida; **inmutable** después) | Alta      |
| 3   | Wizard de onboarding con IA (Flujo A)            | Alta      |
| 4   | Ingreso de contenido propio (Flujo B)            | Alta      |
| 5   | Generación de índice y contenido con IA          | Alta      |
| 6   | Sistema de diseño: paleta 60/30/10 + tipografías | Alta      |
| 7   | Generación de imágenes por sección               | Alta      |
| 8   | Swap de imagen (regenerar con IA / subir propia) | Alta      |
| 9   | Editor por sección (texto, imagen, diseño)       | Alta      |
| 10  | Ebooks bonus y order bumps (mismo flujo de diseño) | Alta   |
| 11  | Vista previa en tiempo real (HTML por ebook)     | Alta      |
| 12  | Exportación PDF: un archivo por ebook + ZIP opcional con todo el paquete | Alta |
| 13  | Saldo y consumo de créditos IA (unificado texto/HTML/imagen) | Alta |
| 14  | Compra de paquetes de créditos IA adicionales (mismo saldo) | Alta |
| 15  | Dashboard: archivar (ilimitado), **20 activos** max; eliminar → papelera **30 días** → hard delete | Media     |
| 16  | Centro de ayuda / FAQ en app + soporte por **email** (contenido ES + PT-BR); **sin** chat en vivo | Media     |
| 17  | **Política de privacidad** + **Términos** (es + pt-BR), enlaces antes de registro/pago; canal email complementario (ver §15) | Alta      |
| 18  | **Ajustes de cuenta:** **exportar mis datos** (paquete descargable) + **eliminar cuenta** con confirmación (modelo C; ver §15) | Alta      |
| 19  | **Avisos in-app** (créditos, renovación, pago fallido) vía webhooks MP + estado; **sin** email de producto propio salvo Auth/MP | Alta      |


### Post-MVP (v1.x — v2.0)


| Feature                                          | Versión estimada |
| ------------------------------------------------ | ---------------- |
| Landing page con vista previa y bloques liquid   | v1.1             |
| OCR / PDF escaneados en importación              | v1.x (tras validar demanda) |
| Chat / soporte síncrono (WhatsApp, widget, etc.) | v1.x             |
| Exportación HTML descargable                     | v1.1             |
| Templates prediseñados por nicho                 | v1.2             |
| Historial de versiones por proyecto              | v1.2             |
| Colaboración (compartir proyecto)                | v2.0             |
| Integración directa con Shopify API              | v2.0             |
| Generación de secuencia de emails de lanzamiento | v2.0             |
| Newsletters / email marketing propio (fuera de Auth/MP) | v1.x      |
| Página de estado pública (status page)             | v1.x             |


---

## 9. Stack técnico


| Capa                 | Tecnología                           | Justificación                                              |
| -------------------- | ------------------------------------ | ---------------------------------------------------------- |
| Frontend             | React + Vite + TypeScript            | Moderno, rápido, amplio soporte en Cursor                  |
| UI Components        | shadcn/ui + Tailwind CSS             | Primitivas Radix; alinear con WCAG 2.1 (ver §4 Accesibilidad) |
| Pagos / facturación  | Mercado Pago                         | Suscripción + top-ups; notificaciones/comprobantes según MP; webhooks → estado en app |
| Backend / BaaS       | Supabase                             | Auth (email transaccional cuenta), DB, Storage, Edge Functions |
| Base de datos        | PostgreSQL (via Supabase)            | Relacional, robusto, gratuito al inicio                    |
| AI — Texto           | Anthropic Claude API (claude-sonnet) | Mejor para generación de contenido estructurado            |
| AI — Imágenes        | Gemini API (Nano Banana)             | Generación/edición con stack Google; validar costos y cuotas en el plan elegido |
| Parsing de docs/PDF  | pdf-parse + mammoth                  | Extracción de texto de `.docx` y PDF con capa de texto (sin OCR en MVP; ver Flujo B) |
| PDF Generation       | Puppeteer (via Edge Function)        | Server-side, clean output                                  |
| Internacionalización | i18next                              | UI solo `es` y `pt-BR`; `content_locale` del proyecto: `es`, `pt-BR`, `en-US`, `en-GB` |
| Deploy Frontend      | Vercel                               | Edge/CDN; ver §15 (hosting); Speed Insights opcional; §4 Rendimiento |
| Rendimiento UX       | Lighthouse / Speed Insights (opc.)   | Baseline vitals en rutas clave; estados de carga — §4      |
| Deploy Backend / datos | Supabase hosted                    | **Región LATAM**; PITR/backups según plan; copias lógicas §15 D |
| Pruebas E2E          | Playwright (pocas specs)             | Modelo B; login, proyecto, wizard — ver §16                |
| Editor de código     | Cursor                               | Desarrollo asistido por IA                                 |
| Avisos de producto   | UI in-app (banner / toast / cuenta)  | Créditos, renovación, pago fallido — modelo B; ver §11     |
| Protección de APIs   | Rate limiting en Edge Functions      | Modelo B; ver debajo                                       |
| Observabilidad       | Vercel + Supabase + alertas (modelo B) | Logs de plataforma; alertas puntuales; ver debajo      |
| Incidentes externos  | UX + runbook interno (modelo B)        | Sin status page pública en MVP; ver debajo               |


---

### Límites de tasa y abuso (v1.0) — modelo B

- **Edge Functions costosas:** aplicar **rate limiting** por **usuario autenticado** (p. ej. `auth.uid`) en invocaciones que llaman a **APIs de pago** o recursos pesados: generación con **Claude** y **Gemini API (imágenes)**, **Puppeteer** (PDF), **`parse-document`**, **`export-user-data`**, y funciones análogas. Los **créditos** limitan el uso económico pero **no** sustituyen el rate limit ante abuso, bugs o bucles en el cliente.
- **Por IP:** **opcional** (p. ej. endpoints públicos, webhooks, o mitigación complementaria). Umbrales **por definir** (solicitudes por minuto / ventana) según pruebas y costos.
- **Implementación:** elegir mecanismo en despliegue (p. ej. Redis/Upstash, tabla + ventana en Postgres, u oferta nativa) y **documentar** umbrales en el repositorio.

### Observabilidad y alertas (v1.0) — modelo B

- **Base:** logs y métricas nativas de **Vercel** (frontend/despliegue) y **Supabase** (Edge Functions, base de datos); revisión **manual** en consolas ante incidentes.
- **Alertas puntuales** (*umbrales y canal — email, Slack, etc. — por definir*):
  - **Webhooks Mercado Pago:** fallos repetidos o cola de eventos no procesados (riesgo de estado de suscripción incorrecto).
  - **Errores en backend:** pico de **5xx** o de fallos en Edge Functions en una ventana corta.
  - **Costo de IA:** gasto **diario estimado** (Claude / Gemini imágenes) por encima de un tope (derivado de presupuesto o de créditos vendidos).
- **Privacidad en logs:** **no** registrar contenido de ebooks, **prompts completos** ni datos personales en claro; preferir **ids** (UUID), códigos de error y contadores. Alinear con §15.

### Incidentes y dependencias externas (v1.0) — modelo B

- **Proveedores críticos:** APIs de **texto**, **imágenes**, **Mercado Pago**, **Supabase**, **Vercel** (y similares). Caídas o lentitud **no** están bajo control total de Obra.
- **Experiencia de usuario:** mensajes de error **claros** (“el servicio no está disponible, probá más tarde”); **reintentos** acotados en el cliente donde tenga sentido.
- **Runbook interno (equipo):** documento **corto** con orden sugerido: **(1)** revisar **estado/salud** en paneles de cada proveedor; **(2)** si el impacto es **prolongado**, activar **banner o aviso global** en la app; **(3)** **email** a usuarios solo si afecta **pagos**, **suscripción** o **riesgo de pérdida/integridad de datos** — no para cada degradación breve de IA. Versión viva en el repo: **`docs/operations/incident-runbook.md`** (inglés, operaciones).
- **Créditos:** **no** descontar créditos si la operación **no** finalizó con éxito en el backend (evitar cobrar por fallo del proveedor); una línea en **FAQ** al respecto.
- **Fuera del MVP:** **página de estado** pública (status page); ver §12.

---

## 10. Arquitectura de datos (entidades principales)

```
users
  id, email, name, plan, ui_locale (es | pt-BR), created_at

subscriptions (opcional si se separa de users)
  id, user_id, plan_id, period_start, period_end, included_ai_credits

credit_ledger (o equivalente)
  id, user_id, delta, balance_after, reason (consumo_ia | compra_paquete | renovación_plan | ajuste), metadata (modelo, tokens, tipo de acción, payment_id), created_at

credit_purchases (opcional; facturación de top-ups)
  id, user_id, credits_granted, amount_paid, currency, payment_provider_id, created_at

projects
  id, user_id, name, status, content_locale (es | pt-BR | en-US | en-GB; inmutable tras creación)
  archived_at (nullable), deleted_at (nullable; papelera — hard delete a los 30 días)
  created_at, updated_at
  -- máx. 20 activos (sin archivar y sin deleted_at) por cuenta

design_system
  id, project_id
  color_primary, color_secondary, color_accent
  font_display, font_body

ebooks
  id, project_id, type (main | bonus | order_bump)
  -- máx. 1 main + 5 bonus + 2 order_bump por proyecto
  title, subtitle, target_avatar
  index (JSON array de capítulos)

chapters
  id, ebook_id, order, title, content_html, image_url

landing_pages (post-MVP)
  id, project_id
  blocks (JSON array de bloques)
  preview_html

images
  id, project_id, chapter_id (nullable)
  url, prompt_used, source (ai|upload)
```

---

## 11. Modelo de negocio

### Planes de suscripción (v1.0)

- **Un solo plan** en el lanzamiento inicial: precio de referencia **USD 29/mes** (ancla de producto). La **cantidad de créditos de IA incluidos** por ciclo y su equivalencia económica (orden de magnitud **~USD 15/mes** en valor de uso de APIs) **no** se fija numéricamente aquí: ver **Investigación — créditos del plan** debajo.
- **Planes adicionales** (p. ej. distintos precios o cupos): fuera del alcance de v1.0 salvo decisión posterior explícita.

#### Investigación — créditos del plan (tarea de producto)

- Definir **cuántos créditos** incluye el plan base por mes y la **tabla de costo en créditos** por tipo de acción (texto, HTML, imagen, etc.) a partir del costo real de APIs y márgenes objetivo.
- Validar que el modelo cierra frente a escenarios de uso (ligero vs intensivo) antes de fijar comunicación pública detallada (“X créditos/mes”).

### Límites de cantidad (v1.0)

- **Por cuenta — proyectos activos:** máximo **20** a la vez. Cuentan como **activos** los que **no** están archivados ni en flujo de eliminación (papelera).
- **Archivar:** el usuario puede **archivar tantos proyectos como quiera** (sin tope de cantidad). Los archivados **siguen ocupando** espacio en base de datos y **Storage** (PDFs, imágenes, etc.); archivar solo los **oculta** de la vista principal y **libera un cupo** dentro del límite de 20 activos.
- **Eliminar:** al **eliminar**, el proyecto entra en **retención de 30 días** (sigue en disco y DB); pasado ese plazo se ejecuta **hard delete** (borrado definitivo de filas y objetos en Storage). Durante los 30 días puede ofrecerse **restaurar** desde papelera (*deseable en MVP*). Tras el hard delete no hay recuperación.
- **Por proyecto:** **1** ebook principal (obligatorio, único); hasta **5** ebooks tipo bonus; hasta **2** ebooks tipo order bump. La UI y el backend deben **impedir** superar estos máximos.
- Los **planes de pago** futuros pueden cambiar cupos o storage; en v1.0 los números anteriores son la **referencia** del producto.

### Créditos de IA (modelo unificado)

- Una misma **moneda de créditos** (interna) financia **toda** la generación con IA: texto (wizard, optimización de campos), contenido e índice, **HTML**, e **imágenes** (cada proveedor/modelo puede tener un **costo en créditos** distinto según precio al backend).
- **Créditos incluidos en la suscripción (por ciclo mensual):** se **renuevan** con cada período de facturación; lo **no consumido al cierre del ciclo no se acumula** al siguiente (el cupo mensual del plan no arrastra).
- **Créditos comprados en paquetes (top-ups):** se ofrecen como **paquetes fijos** de tamaños concretos (cantidades y precios por definir en producto tras la investigación de créditos). Estos créditos **sí se acumulan** en el saldo hasta consumirse (no caducan con el giro mensual del plan). El cobro usa la misma pasarela (**Mercado Pago**). Los ingresos por top-up entran en el **margen** y deben cubrir el costo variable de IA de ese uso adicional.
- El usuario ve **saldo** y **consumo** (MVP: al menos saldo y descuentos por acción o por tipo de acción).
- **Rentabilidad:** validar que el pool de créditos asignado al plan cubra el **costo esperado** (y un margen) según supuestos de uso; si no cierra, se ajusta precio, créditos incluidos, tabla de costos en créditos por acción, o **precio/margen de los paquetes extra**.

### Adquisición (v1.0)

- **Solo pago:** sin free tier, sin prueba gratuita y sin freemium. El uso de la app requiere una suscripción activa al **plan único** (v1.0).
- El registro de cuenta está ligado al flujo de pago (o la cuenta queda sin acceso hasta completar la suscripción, según implementación de checkout).
- **Mercados iniciales:** Argentina y Brasil; **pasarela:** **Mercado Pago** (suscripciones recurrentes y pagos únicos para top-ups de créditos).
- **Moneda y precios al público:** cobro en **moneda local** según mercado (**ARS** en Argentina, **BRL** en Brasil), con **referencia en USD** (p. ej. ancla **USD 29/mes**) en copy cuando ayude a comparar; los importes locales concretos y redondeos dependen de la integración MP y de política comercial.

### Confianza y conversión (sin prueba gratuita)

Sin *try-before-buy*, marketing y las primeras pantallas post-pago cargan más peso que en un modelo con trial:

- **Precios y planes:** comunicación explícita del **plan único**, precio (local + referencia USD), **créditos de IA incluidos** por ciclo (detalle numérico cuando cierre la investigación), **límites** (**20 proyectos activos**, archivados ilimitados, eliminación con retención **30 días**) y **por proyecto** (1 principal + 5 bonus + 2 bumps), qué acciones consumen créditos (y orden de magnitud si aplica), y al **agotar créditos:** opción de **comprar paquetes adicionales** o esperar a la renovación mensual.
- **Demostración de valor:** **video** y **recorrido interactivo** (ambos) que muestren el flujo completo hasta la exportación PDF (ebook + bonuses + bumps).
- **Política comercial (garantía / reembolso):** el **copy** visible al usuario debe **revisarse con asesoría legal** antes del lanzamiento de pagos; plazo, condiciones y texto definitivos no están fijados en este PRD.
- **Soporte inicial:** ver **Soporte (v1.0)** debajo.

### Soporte (v1.0) — modelo B

- **Self-serve primero:** **centro de ayuda / FAQ** integrado en la app (o sección “Ayuda” enlazada desde el layout), con artículos en **es** y **pt-BR** alineados al `ui_locale` o accesibles en ambos idiomas.
- **Contacto:** **correo electrónico** como canal oficial para casos no resueltos por la ayuda. Las **direcciones** (p. ej. soporte / privacidad) son **placeholders** hasta definir dominio y buzones finales; las plantillas de contacto se alinean al tono del producto.
- **Fuera del MVP:** **chat en vivo**, WhatsApp u otros canales síncronos de soporte (ver §12).
- **Expectativas de respuesta:** objetivo interno de **48 h hábiles** como **referencia operativa**; **revisar con asesoría legal** antes de fijarlo en **Términos** u otros textos vinculantes (no es compromiso hasta entonces).

### Notificaciones y correo (v1.0) — modelo B

- **Correo transaccional de cuenta:** **Supabase Auth** (flujos de **verificación** si aplica, **recuperación de contraseña**, etc.), con la configuración SMTP/plantillas que provea Supabase. **No** se introduce en el MVP un proveedor de email masivo aparte (p. ej. Resend/Campaign Monitor) salvo requerimiento técnico.
- **Pagos y facturación:** **Mercado Pago** gestiona comprobantes y notificaciones propias del checkout según su producto; Obra **no duplica** envíos de recibo si el usuario ya los recibe por MP, salvo decisión comercial posterior.
- **Producto (sin depender de email):** **avisos en la app** — banner, toast o sección en **cuenta** — para situaciones críticas: **créditos bajos o agotados**, **renovación próxima**, **pago rechazado o suscripción en riesgo**, alimentados por **webhooks** de Mercado Pago y estado en base de datos.
- **Fuera del MVP:** newsletters, resúmenes por correo de uso, “drip” de onboarding por email (salvo lo que ya envíe Auth/MP por su cuenta).

### Modelo de costos a considerar

- **Unidad económica clave:** margen = ingreso por suscripción (**USD 29/mes** como ancla) + **ingresos por créditos comprados aparte** − **costo variable de IA** (texto + imagen según uso real) − costos fijos (infra, soporte, pagos). El valor de uso de APIs cubierto por el plan (orden de magnitud **~USD 15/mes** en créditos incluidos) debe mapearse vía **tabla de conversión créditos → USD de costo** por modelo/acción; **validar** con escenarios (usuario ligero vs intensivo y uso con top-ups) en la **investigación de créditos del plan**.
- Claude API: ~$0.003 por 1K tokens (output) — entra en el mismo pool de créditos que el resto.
- Gemini API (imágenes / Nano Banana): **validar** precio por imagen en la tarifa vigente de Google — idem en el modelo de créditos.
- Supabase: gratuito hasta 500MB DB / 1GB storage
- Vercel: gratuito en tier hobby

---

## 12. Lo que queda FUERA del MVP

- Landing page para Shopify (vista previa y bloques liquid; ver post-MVP)
- App mobile (solo web responsive)
- Editor drag & drop visual (WYSIWYG)
- Integración directa con Shopify API
- OCR en PDFs escaneados para importación (texto solo en PDF “seleccionable” en MVP)
- Cambiar el idioma de salida (`content_locale`) de un proyecto ya creado (crear otro proyecto)
- Generación de videos o audio
- Marketplace de templates de pago
- Multi-usuario por cuenta (teams)
- Soporte por chat en vivo, WhatsApp o teléfono (MVP: email + ayuda en app; ver §11)
- White label
- Campañas de **email marketing** propias (MVP: **Supabase Auth** + notificaciones **Mercado Pago** + avisos **in-app**; ver §11)
- **CAPTCHA** u otro desafío en **registro** (salvo reactivación ante abuso documentado; el **rate limit** técnico §9 sigue siendo la base)
- **Página de estado** pública (status page tipo Instatus / Statuspage; el MVP usa mensajes en app + runbook §9)

---

## 13. Métricas de éxito (primeros 3 meses)

- Modelo económico del plan base (precio vs créditos vs costo API) **validado** antes o durante el lanzamiento inicial (objetivo: margen positivo en escenarios de uso definidos)
- 100 suscripciones de pago activas en el primer mes
- 30% de conversión de inicio de checkout a suscripción activa (primer mes; mide fricción de pago)
- Tiempo de creación de primer ebook completo < 20 minutos
- NPS > 40
- Churn mensual < 8%

---

## 14. Riesgos y mitigaciones


| Riesgo                                 | Probabilidad | Mitigación                                   |
| -------------------------------------- | ------------ | -------------------------------------------- |
| Conversión baja sin trial (desconfianza / precio) | Media        | Precios claros, **video + tour interactivo**; copy de garantía/reembolso **revisado con legal** (§11) |
| Fallas o complejidad en suscripciones / webhooks Mercado Pago | Media | Integración según docs oficiales, sandbox, pruebas de renovación y de compra de créditos |
| Rentabilidad del plan (p. ej. USD 29 con ~USD 15 en créditos) no cierra frente al uso real | Media        | Modelo de créditos unificado, tabla de costos por acción, escenarios de uso, ajuste de precio o créditos incluidos |
| Costos de API más altos de lo esperado | Media        | Límite vía créditos, caché donde aplique, revisión de precios de proveedores |
| Usuarios suben PDF escaneado y esperan importación automática | Media | Mensajes y ayuda en UI; OCR post-MVP; alternativa pegar texto |
| Calidad de imágenes IA inconsistente   | Media        | Permitir fácil regeneración y upload propio  |
| Curva de aprendizaje del usuario       | Baja         | Wizard muy guiado + video + recorrido interactivo (§11) |
| Competidor grande copia la idea        | Baja         | Velocidad de ejecución + comunidad LATAM     |
| Expectativas legales (LGPD / AR) sin canal ni políticas | Media | §15: documentos, región de datos, **autoservicio** export + baja de cuenta |
| Muchos proyectos archivados / en papelera aumentan costo de Storage | Media | Monitoreo, límites de plan futuros, comunicar que archivar no libera espacio hasta eliminar |
| Abuso o picos de llamadas a Edge Functions (costo API) | Media | Rate limiting por usuario (§9 modelo B); alertas de costo |
| Fallos silenciosos en webhooks MP o picos de error sin detección | Media | Observabilidad modelo B: alertas webhooks + 5xx + umbral de costo IA |
| Pérdida de datos (DB o Storage) por error o incidente | Media/Baja | PITR + export periódico externo (§15 D); prueba de restauración |
| Caída prolongada de proveedor (IA, MP, Supabase) sin comunicación | Media | Modelo B: banner in-app; email solo si afecta pagos o datos |


---

## 15. Cumplimiento, datos y hosting (borrador)

**Contexto:** usuarios en **Argentina** y **Brasil**; empresa radicada en **Argentina**. Texto legal definitivo y ley aplicable — **revisión con asesor legal** antes de lanzamiento de pagos.

### A) Documentos legales y checkout

- **Política de privacidad** y **Términos / condiciones de uso** (o equivalente) en **español** y **portugués (Brasil)**, accesibles desde el **footer** y **antes** de completar registro o pago.
- **Ley aplicable, jurisdicción** y cláusulas de servicios digitales — *definir con abogado* (empresa en Argentina; usuarios en BR implican atención a **LGPD** y normativa local).

### B) Derechos de titulares de datos — **autoservicio (modelo C, MVP)**

- **En la app (Ajustes de cuenta):**
  - **Exportar / descargar mis datos:** el usuario obtiene un **paquete descargable** con copia de la información que Obra trata sobre él (portabilidad). Contenido mínimo: perfil, proyectos, ebooks/capítulos, sistema de diseño, registros de créditos relevantes y **referencias a assets** en Storage; formato **por definir** (p. ej. `JSON` estructurado + archivos en `ZIP`). Si el volumen es grande, **generación asíncrona** + enlace de descarga temporal (firmado).
  - **Eliminar cuenta:** flujo con **confirmación fuerte** (p. ej. reingreso de email o frase de confirmación). Debe **cancelar o coordinar la baja** de la **suscripción en Mercado Pago** según la integración disponible; luego **eliminar** datos del usuario en **Auth**, **base de datos** y **objetos en Storage** asociados, o proceso de purga acorde a **asesoría legal**. Si hace falta un **periodo de gracia** antes del borrado definitivo de la cuenta, *definir con abogado* y reflejarlo en Términos.
- **Canal email** (dirección **placeholder** tipo `privacidad@…` hasta dominio final): complementario para **rectificación**, solicitudes atípicas o incidencias que no cubra el autoservicio; **revisar** con asesoría legal al cerrar buzones y textos.
- **Objetivo para solicitudes por email** (cuando aplique): respuesta del orden de **30 días** salvo complejidad (formalizar en Política/Términos con asesoría legal).

### C) Residencia de datos y proveedores

- **Base de datos, auth, storage y Edge Functions:** **Supabase**, con **región elegida explícitamente** al crear el proyecto; **objetivo: LATAM** (p. ej. Sudamérica — verificar región disponible en el panel de Supabase al provisionar). Anotar **región y referencia del proyecto** en **`docs/infrastructure/supabase.md`** tras el alta.
- **Frontend / despliegue:** **Vercel** (aplicación web); el tráfico y assets se sirven según configuración de Vercel (edge/CDN).
- **Listado de subprocesadores** en la política de privacidad (mínimo): Vercel, Supabase, Mercado Pago, proveedores de IA (p. ej. Anthropic, Google Gemini), según lo que procesen datos personales en producción.

### D) Backups y recuperación (v1.0) — modelo B

- **Supabase:** habilitar **PITR** (point-in-time recovery) u opción equivalente de **backups continuos** **si el plan contratado lo incluye**; confirmar al elegir tier y región.
- **Copia de seguridad lógica periódica:** **export** programado (p. ej. **semanal**) de la base de datos (p. ej. `pg_dump` o backup nativo exportable) y **estrategia** para **Storage** (objetos en bucket: listado + copia o sync) — *detalle de automatización por definir*.
- **Destino:** copias almacenadas **fuera** de la única línea de producción sin redundancia (otro bucket, cuenta cloud o almacenamiento compatible **S3** con **cifrado** en reposo y acceso restringido al equipo).
- **RPO/RTO:** **no** prometer tiempos de recuperación al usuario final salvo **SLA** comercial explícito; mantener **runbook interno** (quién restaura, en qué orden: DB → Storage → verificación).
- **Práctica recomendada:** **prueba de restauración** periódica (p. ej. trimestral) en entorno aislado — *calendarizar en operaciones*.

---

## 16. Lanzamiento y salida a producción (v1.0)

### Estrategia — **soft launch (opción C)**

- La aplicación puede estar **accesible públicamente** y aceptar **registros y pagos**, pero **sin** campaña de marketing agresiva (ads masivos, influencers, lanzamiento mediático) **hasta** completar el **checklist “listo para cobrar”** y estabilizar el primer tráfico real.
- Objetivo: reducir riesgo reputacional y de soporte mientras se validan **Mercado Pago**, **webhooks**, **créditos** y flujos legales en producción.

### Checklist “listo para cobrar” (Definition of Done comercial)

Antes de **escalar** comunicación comercial o inversión en adquisición, el equipo confirma como mínimo:

1. **Mercado Pago:** flujo de **suscripción** y **compra de créditos adicionales** probados en **sandbox** y al menos **un** flujo de pago **real** en producción; **webhooks** recibidos y procesados correctamente.
2. **Créditos:** el saldo y los descuentos son **coherentes**; los créditos se **descuentan solo** tras **éxito** de la operación en backend (alinear con §9).
3. **Legal / datos:** **Política de privacidad** y **Términos** publicados; flujos de **exportar datos** y **eliminar cuenta** accesibles y probados (§15).
4. **Observabilidad (modelo B):** al menos **una** alerta operativa activa (p. ej. fallos repetidos de webhooks MP o pico de errores 5xx).
5. **Backups (modelo D):** **PITR** u opción equivalente activada **si el plan lo incluye**, **o** al menos **un** export lógico documentado y guardado fuera de la cuenta de producción única.

*La lista puede ajustarse con el equipo; lo crítico es no “gritar” el lanzamiento antes de ver pagos y datos estables.*

### QA y pruebas (v1.0) — modelo B

- **Manual (obligatorio antes de deploy a producción):** guion de **smoke test** en **`docs/operations/smoke-test.md`**: **Mercado Pago** (sandbox + verificación de webhooks), **flujo de pago** acordado, **créditos**, camino feliz **crear proyecto → wizard → editor → export** (o subconjunto mínimo acordado), más **recorrido solo teclado** del wizard según §4; checklist opcional legal/performance según ese documento. Quien despliega **no** salta este paso hasta soft launch maduro.
- **Automatizado:** **Playwright** (u homologo) con **pocas** pruebas E2E **estables** (orientación **1–3**): p. ej. **login**, **crear proyecto**, **avanzar** al menos un paso del wizard. Las respuestas de IA pueden **mockearse** en test o ejecutarse contra **staging** con costo acotado.
- **Alcance:** no se exige **suite E2E completa** en el MVP; se amplía con la madurez del producto.
- **CI:** ejecutar E2E en **pull request** o antes de merge a rama principal — decisiones abiertas y plantilla en **`docs/development/ci-pipeline.md`**.
- **Rendimiento (modelo B):** antes de un release relevante, **revisión puntual** (Lighthouse local o panel de Vercel) en **al menos una** ruta autenticada acordada — *sin* gate duro de métricas en CI salvo que el equipo lo incorpore después.

---

*Documento generado como base para desarrollo. Próximo paso: documento de arquitectura técnica detallada.*