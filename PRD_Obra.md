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

### Edición del proyecto, estados respecto del export y duplicación (v1.0)

Esta subsección cierra reglas de producto para **editar un proyecto existente**, **alineación con PDFs exportados**, **reabrir el onboarding de estructura**, **rama Upload**, **reset por avatar/problema** y **duplicar proyecto**. Detalle de UI por paso: `features/wizard-shared`, `wizard-ai-generation`, `wizard-upload`, `wizard-preview`.

#### Campo `status` del proyecto (respecto del export)

El campo **`status`** en `projects` admite **solo** los tres valores siguientes. Si hace falta otro eje (p. ej. progreso interno del wizard), usar **otro** campo o convención explícita en el modelo de datos — **no** sobrecargar `status`.

| Valor | Significado |
| ----- | ----------- |
| **`draft`** | Primera generación del proyecto: **aún no** hubo **ningún** export exitoso que cuente como publicación. |
| **`published`** | Hubo **al menos un** export exitoso (da igual si fue **un** PDF de un entregable, varios o el **ZIP** del proyecto — con **uno** alcanza). El proyecto queda alineado con “última publicación/export” desde la perspectiva de la app. |
| **`modified`** | Tras estar `published`, hubo **cambios materiales** (lista debajo). Los archivos PDF ya descargados por el usuario **no** se actualizan solos; la app refleja que el paquete **puede** estar desactualizado respecto del último export hasta que vuelva a exportar con éxito. |

**Transiciones**

- Proyecto nuevo → `draft`.
- `draft` → `published`: **primer** export exitoso (cualquier entregable o ZIP, según la acción que el backend considere “export exitoso” para actualizar el campo).
- `published` → `modified`: al persistir cualquier **cambio material** (lista siguiente).
- `modified` → `published`: **cualquier** export exitoso posterior (misma regla: al menos uno exitoso en esa operación de export).
- Mientras el proyecto permanece `draft`, los cambios **no** pasan por `modified` (no había línea base `published` previa).

**Cambios que pasan el proyecto a `modified`** (cuando el estado actual era `published`)

Persistir cualquiera de:

- **Diseño:** fila de sistema de diseño del proyecto (paleta 60/30/10, tipografías, tamaño/orientación de página, `image_mode` / `image_style`, y campos equivalentes definidos en `design_systems`).
- **Contenido de entregables:** HTML/texto de capítulos, índice/estructura de capítulos del main, contenido de bonuses u order bumps, o metadatos de entregable que afecten el artefacto exportado (p. ej. títulos que salgan en PDF).
- **Imágenes del paquete:** slots por capítulo, **portada/cover**, **assets de proyecto** vinculados al preview/export, ya sean IA o **subida del usuario** (sustitución o borrado que cambie el resultado exportable).
- **Estructura de paquete** cuando afecte entregables existentes (conteos, eliminación o adición de bonuses/bumps, cambios que invaliden contenido previo) — salvo que implementación limite ciertos cambios; la intención de producto es que **sí** cuenten como material si impactan lo exportable.
- **Rama Upload:** **reemplazo del archivo** fuente tras el flujo explícito de reemplazo (ver abajo).
- **Reset “comenzar de nuevo”** tras cambio de avatar o problema (ver abajo): siempre deja el proyecto en situación equivalente a contenido regenerable; el **`status`** debe actualizarse según reglas de implementación (p. ej. vuelta a `draft` hasta nuevo export, o `modified` si ya había `published` — **definir en implementación de forma consistente** con el hecho de que los PDF previos ya no representan el paquete actual).

**Cambios que por sí solos no exigen flujo especial de “alineación”**

- Editar **títulos de bonuses** o **título del main** u otros ajustes de texto de estructura que **no** sean avatar ni problema: **no** requieren el modal de “comenzar de nuevo”; siguen las reglas normales de persistencia y, si el proyecto estaba `published`, pasan a `modified` si califican como cambio material.

**UX**

- Mostrar el estado (`draft` / `published` / `modified`) en dashboard y/o cabecera del proyecto; en `modified`, copy orientado a **reexportar** si el usuario quiere un paquete PDF al día (mensaje **no bloqueante**).
- No prometer **versionado** de PDFs en la app: el usuario puede conservar archivos viejos en su disco; la app solo refleja estado y última acción de export exitosa.

#### Diseño después del wizard

- El usuario puede **editar el sistema de diseño** tras completar el paso de diseño del onboarding, desde una **superficie dedicada** (p. ej. “Apariencia del proyecto”), además de poder **reabrir** el paso Diseño dentro del flujo de estructura si el shell lo permite.
- **Una sola fuente de verdad** en base de datos para colores, fuentes y defaults de imagen (`design_systems` por proyecto).

#### Reabrir estructura (onboarding completo)

- El usuario puede **volver a recorrer el onboarding de estructura** (tema, avatar, problema, paquete, diseño) en un **proyecto ya existente**.
- **Créditos:** no hay recargo ni tarifa extra por “reabrir estructura”. Solo se consumen **los mismos créditos** que correspondan a **llamadas a IA** que el usuario dispare después (igual que en el resto del producto).

#### Cambio de avatar o problema

- Si el usuario **cambia avatar o problema** guardados, la app debe **advertir** que el contenido existente del paquete **puede dejar de estar alineado** con ese nuevo marco (texto e imágenes).
- Ofrecer CTA **“Comenzar de nuevo con estos parámetros”** con **confirmación en dos pasos** (explicar alcance → confirmar).
- **Alcance del reset al confirmar:** todo el **contenido de texto** y el **estado de hitos** asociados del **ebook principal, bonuses y order bumps**. **No** se redefine en este reset el `content_locale` ni el diseño por defecto salvo que el producto decida lo contrario en otra regla; la intención es vaciar/regenerar el **contenido acoplado al avatar/problema**.
- **Imágenes (política estricta):** eliminar **referencias en base de datos** y los **objetos en Storage** correspondientes para: imágenes por slot (incluidas **subidas por el usuario**), **portadas/covers**, y **demás assets de proyecto** usados en preview/export del paquete. Objetivo: evitar mezcla visual entre marco viejo y nuevo.
- **Rama Upload:** tras el reset, el **binario** del manuscrito puede seguir existiendo en Storage; el usuario continúa en el flujo de **Contenido** con el **mismo archivo** (re-alineación / hitos) o usa el flujo explícito de **reemplazar archivo** según `features/wizard-upload`. El reset **no** sustituye automáticamente el archivo fuente.

#### Reemplazo del archivo (rama Upload)

- En **cualquier** momento (incluso tras aprobar alineación o con contenido avanzado), el reemplazo del `.docx`/`.pdf` ocurre **solo** mediante un flujo explícito **“Reemplazar archivo”**, con **confirmación fuerte** y advertencia sobre impacto en índice/capítulos.
- La **extracción** (parse sin LLM) **no** consume créditos de IA; aplicar reglas de **modal fuerte** si **todos** los capítulos quedan por debajo del umbral tras la alineación (`features/wizard-upload`, `wizard-ai-generation`).

#### Duplicar proyecto

- **Duplicar** crea una **copia completa** del proyecto: mismos datos persistidos necesarios para un clon usable (metadatos, diseño, ebooks, capítulos, imágenes, archivo upload en Storage si aplica, etc.) bajo **nuevo** `project_id`, respetando límites de cuenta (**20 activos**, archivo, papelera).
- La implementación debe definir **copia de objetos en Storage** (nuevas rutas/prefijos) para que el borrado o retención de un proyecto **no** rompa al clon.

#### Dependencias de implementación (resumen)

- El **backend** debe registrar **export exitoso** para actualizar `projects.status` (`draft`/`modified` → `published`).
- Orden transaccional y permisos (**RLS**) al borrar filas de imágenes y objetos en Storage en el reset por avatar/problema; manejar fallos parciales sin dejar referencias rotas.
- **i18n:** textos de modales y badges en **es** y **pt-BR** alineados a `ui_locale`.

---

## 4. Flujos principales de usuario

### Orden de creación de proyecto (v1.0)

El **onboarding** (tema, avatar + problema, **estructura de paquete**: conteos y títulos de bonuses y order bumps, **título del ebook principal**, diseño con paleta y tipografías) es **único y compartido**. **No** define en esta fase el **desglose en capítulos** del ebook principal — eso ocurre en la fase **Contenido** (ver punto 4). La **subida de archivo** no inicia el flujo: ocurre **después** del paso de diseño cuando el usuario eligió **contenido por archivo**; el archivo alimenta el **cuerpo** del main ebook tras parseo y alineación, no la definición previa de diseño.

```
1. Crear nuevo proyecto (incluye elegir content_locale — ver §2)
2. Elegir fuente de contenido: IA pura **o** archivo (.docx / .pdf) más adelante
3. Onboarding compartido (asistencia IA en campos de texto del wizard):
   - Tema → Avatar + problema → Estructura de **paquete** (título main, **autor opcional** a nivel proyecto en la misma pantalla que el título principal, conteos/títulos bonuses/bumps) → Diseño
     (presets, paleta 60/30/10, tipografías, medida/orientación de hoja, notas de estilo) — detalle: `features/wizard-shared/wizard-shared.md`
4. Fase Contenido — bifurcación (tras el diseño); especificación: `features/wizard-ai-generation/wizard-ai-generation.md`
   ├─ Rama IA: índice/capítulos del **ebook principal** propuestos y confirmados aquí → cuerpo por capítulo → bonuses → bumps
   └─ Rama Upload: un solo archivo del **ebook principal** (.docx / .pdf) → parseo + IA → **alineación** a formato Obra (índice y capítulos) con **aprobación del usuario** → mismo flujo de hitos (**prefill** del main) → bonuses → bumps
5. **Vista previa** (paso global 3) y exportación: revisión con **layouts** y **slots de imagen**, portada con IA, PDF por entregable y ZIP del proyecto — especificación: `features/wizard-preview/wizard-preview.md` (igual para ambas ramas de contenido)
```

### Onboarding compartido (hasta diseño)

- Wizard guiado paso a paso — en **campos de texto largo**, el usuario puede escribir algo básico y la IA lo optimiza con **“mejorar texto”** (créditos; ver §11).
- Pasos de producto (detalle en `features/wizard-shared/wizard-shared.md`): tema; avatar + problema; estructura de **paquete** (conteos y títulos bonuses/bumps, título del ebook principal, **autor opcional** en proyecto); diseño (preset o manual, paleta, tipografías, formato de hoja). **Capítulos del main ebook:** fase Contenido, no el wizard.
- **No** se sube archivo en esta fase.

### Rama contenido — IA (tras el diseño)

**Especificación del flujo (hitos, índice congelado, chat por artefacto, créditos por llamada):** `features/wizard-ai-generation/wizard-ai-generation.md`.

Resumen de alto nivel:

```
1. En la fase Contenido, la IA propone **índice y capítulos** del ebook principal a partir del contexto del wizard (el wizard **no** fijó el número de capítulos)
2. Usuario confirma el índice; luego **cuerpo por capítulo**; luego **bonuses y order bumps** según conteos/títulos ya definidos en el wizard
3. Imágenes por sección según reglas de §6
4. Usuario revisa y edita por sección; IA genera/refina HTML; iteración según créditos
5. Exportación PDF (§7)
```

### Rama contenido — Upload (tras el diseño)

```
1. Usuario sube un único archivo .docx o .pdf del **ebook principal** (única ingesta de archivo en v1.0)
2. Parseo + IA (síncrono; ver reglas abajo): propuesta de **índice y división en capítulos** alineada a formato Obra
3. Usuario **edita y aprueba** la alineación (títulos, fusiones/particiones de secciones según producto)
4. Continúa el **mismo** flujo de hitos que la rama IA: cuerpo por capítulo con **prefill** desde el archivo, luego bonuses y bumps generados en esa fase
5. Misma revisión, HTML, exportación que la rama IA
```

### Importación de archivos (rama Upload — contenido) — reglas MVP

- **Formatos:** `.docx` estándar y **PDF con texto seleccionable** (capa de texto real). **No** se soporta en v1.0: PDF escaneado o basado solo en imagen; **OCR** queda **post-MVP** si se prioriza.
- **Tamaño máximo por archivo:** **10 MB** (`.docx` y `.pdf`). Un ebook mayormente texto rara vez lo supera; si lo hace, el usuario puede reducir peso del archivo o dividir el contenido en otro `.docx`/`.pdf` dentro del límite. El tope se puede revisar con datos reales.
- **Un archivo por intento:** en cada importación, **un solo archivo** por pasada (no múltiples PDFs a la vez en el MVP).
- **PDF con contraseña / cifrado:** **rechazar** con mensaje claro; sugerir exportar o guardar una copia **sin contraseña** y volver a subir.
- **Extracción vacía o inválida:** mensaje explícito y opción de **reintentar** con otro archivo (mismo flujo de importación).
- **Parseo + análisis IA (v1.0):** flujo **síncrono** — el usuario permanece en la misma pantalla con **estado de carga** hasta completar extracción y análisis o recibir error; **no** cola en background en el MVP. Deshabilitar **doble envío** mientras la petición está en curso (alinear con §4 rendimiento percibido).
- **Créditos (extracción vs IA):** la **extracción de texto** (.docx/PDF con librerías, **sin pasar por LLM**) **no descuenta** créditos de IA del usuario (costo de plataforma); **sí** descuentan las llamadas que invoquen **modelo de lenguaje** (propuesta de división, regenerar división, refinar/expandir capítulo, bonuses/bumps, etc.) — ver `features/wizard-ai-generation/wizard-ai-generation.md` y §11.
- **Reemplazo del archivo (v1.0):** el usuario puede **sustituir** el `.docx`/`.pdf` **en cualquier momento** mediante el flujo explícito **“Reemplazar archivo”** (confirmación fuerte, impacto en índice/capítulos). Sin sustitución silenciosa del binario. Ver **§3 — Edición del proyecto** y `features/wizard-upload`.
- **Asistencia en alineación (v1.0):** además de edición manual de títulos y límites, un botón tipo **“Volver a proponer división con IA”** sobre el **mismo** texto parseado; **no** hilo de chat dedicado solo a la alineación (reduce duplicación con el índice de la rama IA).
- **Prefill débil (v1.0 — decisión C2):** si un capítulo queda con **muy poco texto** tras el prefill, **aviso no bloqueante** y opción de **completar con IA** (créditos); **no** se bloquea **Aprobar capítulo** por ese motivo. Si **todos** los capítulos quedan por debajo del umbral tras la alineación, **modal fuerte** que impide avanzar hasta corregir **alineación**, **regenerar división** o **archivo** (según reglas de reemplazo); detalle en `features/wizard-ai-generation/wizard-ai-generation.md`.
- **Retención del archivo (v1.0):** el binario subido se **conserva** en Storage **privado** mientras exista el **proyecto** (misma lógica de ciclo de vida que otros assets del proyecto). Eliminación opcional post-MVP desde ajustes de proyecto.
- **Logs y telemetría:** **no** registrar contenido del manuscrito ni prompts completos; **sí** metadatos (ids, código de error, duración, tamaño, tipo MIME, resultado). Alinear con arquitectura y privacidad.
- **Reintentos (parse):** **un** reintento automático en cliente con backoff corto ante fallo transitorio; botón **Reintentar** con el **mismo** archivo (**sin** créditos de IA por la extracción). Sin cola en servidor en el MVP.

### Flujo C — Proyecto existente (Contenido + Vista previa)

```
1. Usuario entra a proyecto guardado
2. Navega entre ebook principal, bonuses y order bumps (mismo sistema de diseño)
3. En **Contenido** (paso global 2): editar texto, índice/capítulos según reglas de `features/wizard-ai-generation/wizard-ai-generation.md`; IA por hito según créditos
4. En **Vista previa** (paso global 3 — `features/wizard-preview/wizard-preview.md`): ver layouts finales; **imágenes** por slots (regenerar con IA / subir); portada IA; **sin edición in-place de texto largo en MVP** (volver a Contenido)
5. **Diseño post-wizard** y **reabrir estructura** (onboarding completo), **estados** `draft` / `published` / `modified`, **reset por avatar/problema**, **duplicar** y **reemplazar archivo** Upload: ver **§3 — Edición del proyecto, estados respecto del export y duplicación**.
6. Re-exportar PDF: **un PDF por entregable**; **ZIP** con todos los PDFs del proyecto; política de fallos del ZIP — ver `features/wizard-preview/wizard-preview.md`. Un export exitoso actualiza `projects.status` según §3.
```

*Nota:* el detalle de **swap de imagen**, **export** y **preview** está en **`features/wizard-preview/wizard-preview.md`**; hitos de texto en **`features/wizard-ai-generation/wizard-ai-generation.md`**.

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

### Presets de diseño

- Un **preset** agrupa **paleta 60/30/10** y **par tipográfico** (display + body); al aplicarlo, se actualizan ambos de forma conjunta.
- Si el usuario **edita manualmente** cualquier color o fuente, el estado pasa a **personalizado** (se desvincula del preset activo); puede aplicar otro preset o, si la UI lo ofrece, **restaurar** el último preset elegido.
- **Pendiente de definir (producto / diseño):** la **lista concreta de presets** para el MVP — nombres, combinaciones de colores y fuentes, y criterios de inclusión (p. ej. cuántos presets mínimos para lanzamiento).

### Aplicación consistente

- El sistema de diseño se define UNA vez por proyecto
- Se aplica automáticamente al ebook principal, todos los bonuses y order bumps (y en post-MVP a la landing)
- Si el usuario cambia la paleta, se actualiza en todos los documentos del proyecto

---

## 6. Generación y gestión de imágenes

**Ámbito y referencias (para no duplicar reglas contradictorias):** El comportamiento **por sección** en el **editor** (regenerar, reemplazar, eliminar, repositorio) se describe **aquí** como fuente de verdad del producto. Los **valores por defecto a nivel proyecto** (`image_mode`, `image_style`) se capturan en el paso **Diseño** del onboarding compartido — ver **`features/wizard-shared/wizard-shared.md`** (sección **Image defaults**). **Pipeline de vista previa** (slots, cola al abrir Preview, regeneración con confirmación, portada): **`features/wizard-preview/wizard-preview.md`**. **Facturación en créditos por generación de imagen:** acoplada a generación exitosa en ese pipeline; reglas globales y tabla — **§11** y este §6; no duplicar triggers detallados en el PRD maestro.

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
- **Descarga conjunta (MVP):** acción para obtener **un ZIP** que incluya los PDFs del proyecto (nombres claros; sin fecha en el nombre — ver `features/wizard-preview/wizard-preview.md`). Si **falla** la generación de **cualquier** PDF del lote, el ZIP **aborta** (error global; sin paquete parcial en MVP).
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
| 3   | Onboarding compartido (wizard hasta **diseño**: tema → **paquete** (títulos/conteos bonuses-bumps, título main, **autor opcional**) → paleta/tipografías) + elección **IA vs archivo** al crear | Alta      |
| 4   | Contenido post-diseño: **índice/capítulos del main** + cuerpo + bonuses/bumps — rama **IA** o **subida** `.docx`/`.pdf` con alineación y **mismo** flujo de hitos (`wizard-ai-generation`) | Alta      |
| 5   | Índice y capítulos del ebook principal en fase Contenido; generación/refinado de texto con IA (incl. bonuses/bumps) | Alta      |
| 6   | Sistema de diseño: paleta 60/30/10 + tipografías | Alta      |
| 7   | Generación de imágenes por sección               | Alta      |
| 8   | Swap de imagen (regenerar con IA / subir propia) | Alta      |
| 9   | Contenido: edición de texto por hito; **Vista previa:** imágenes y export (texto largo no in-place en MVP — `wizard-preview`) | Alta      |
| 10  | Ebooks bonus y order bumps (mismo flujo de diseño) | Alta   |
| 11  | Vista previa (paso 3) + layouts + imágenes por slot + export PDF/ZIP — `features/wizard-preview/wizard-preview.md` | Alta      |
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
| Parsing de docs/PDF  | pdf-parse + mammoth                  | Extracción de texto de `.docx` y PDF con capa de texto (sin OCR en MVP; **tras** el paso de diseño — rama Upload; ver §4) |
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
  id, user_id, name, status (draft | published | modified), content_locale (es | pt-BR | en-US | en-GB; inmutable tras creación)
  author (TEXT nullable; opcional; mismo campo “autor/marca” unificado — captura en wizard con título principal)
  archived_at (nullable), deleted_at (nullable; papelera — hard delete a los 30 días)
  created_at, updated_at
  -- máx. 20 activos (sin archivar y sin deleted_at) por cuenta
  -- status: ver §3 — draft = sin export exitoso aún; published = al menos un export exitoso; modified = cambios tras published hasta el próximo export exitoso

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
- **Verificación de email (v1.0):** para registro **email/contraseña**, **Supabase Auth** exige confirmación de correo (`email_confirmed_at`). **Orden de acceso:** primero email verificado, luego suscripción activa. Si el usuario inicia sesión con email **no verificado**, la app muestra **solo** la pantalla de verificación (instrucciones, **reenvío de enlace**, enlace a ayuda/soporte): **sin** dashboard, **sin** checkout de suscripción y **sin** resto de la herramienta. El **checkout de Mercado Pago** para la suscripción **no** se ofrece hasta que el email esté verificado — evita cobros ligados a buzones inválidos o inaccesibles y el caso “pagó y no puede entrar” por bandeja sin confirmar. **OAuth** (p. ej. Google): si Supabase marca el email como verificado, no se muestra esa pantalla. Un pago registrado con cuenta aún no verificada se trata como **bug de implementación** (gating roto), no como flujo soportado.
- **Vinculación de identidades (v1.0):** **un solo `user_id` de negocio** por persona para perfil, datos, ledger y vínculo con Mercado Pago (metadata/`external_reference`). Los métodos previstos incluyen **email/contraseña** y **OAuth** (p. ej. **Google**). **Supabase Auth** debe **vincular** (link) identidades al **mismo usuario** cuando el **email coincide** y está **verificado** en el proveedor, **evitando** una segunda cuenta duplicada por el mismo correo. La **cuenta / ajustes** debe permitir **conectar un proveedor adicional** de inicio de sesión al usuario autenticado (cuando el producto exponga la acción). Cuentas **duplicadas** por fallo de configuración o casos límite no son flujo normal: **soporte** + corrección de linking; **no** se promete fusión automática de datos entre dos `user_id` en v1.0 salvo decisión expresa posterior.
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

- **Correo transaccional de cuenta:** **Supabase Auth** (flujos de **verificación de email** según **Adquisición (v1.0)** — email/contraseña; **recuperación de contraseña**, etc.), con la configuración SMTP/plantillas que provea Supabase. **No** se introduce en el MVP un proveedor de email masivo aparte (p. ej. Resend/Campaign Monitor) salvo requerimiento técnico.
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
| Usuarios suben PDF escaneado y esperan importación automática | Media | Mensajes y ayuda en UI; OCR post-MVP; alternativa: exportar texto a `.docx` y subir |
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