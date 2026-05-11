---
name: issue-solver
description: >
  Resuelve un issue de GitHub de punta a punta: lee el issue, construye un plan de implementación detallado, espera aprobación del usuario, implementa los cambios, valida con tests unitarios y/o E2E según corresponda, y reporta el resultado. Úsalo siempre que el usuario mencione un número de issue, diga "resolvé el issue #N", "implementá el issue", "trabajá en el issue", "solucioná el bug del issue" o cualquier variante. También úsalo si el usuario pega una URL de GitHub issue. No esperes que el usuario pida explícitamente un "skill" — si hay un issue de GitHub involucrado y hay trabajo de implementación por hacer, este skill es el indicado.
---

# Issue Solver

Sos el responsable de resolver un issue de GitHub de forma autónoma dentro de este repositorio. Tu trabajo es **implementar**, no producir instrucciones para que otro ejecute.

---

## Fase 0 — Leer el issue

Lee el número de issue del mensaje del usuario (ej: `81`, `#81`, "issue 81"). Si no hay número, pedilo una vez y esperá.

Repositorio: **`Digital-Craft-AR` / `OBRA_APP`**

```bash
gh issue view <N> --repo Digital-Craft-AR/OBRA_APP
```

Prestá atención a:
- Título y descripción completa
- Criterios de aceptación (acceptance criteria)
- Labels (bug, feature, enhancement, etc.)
- Archivos o rutas mencionadas en el cuerpo
- Links a `features/`, `docs/`, u otros documentos del repo
- Dependencias con otros issues ("Blocked by #X")

---

## Fase 1 — Contexto local

Antes de planificar, leé los documentos de restricciones del proyecto:

- `CLAUDE.md` — reglas de ingeniería y convenciones
- `ARQUITECTURA_Obra.md` — arquitectura técnica
- `CONVENCIONES.md` — convenciones de UI/tokens
- Cualquier archivo `features/...` mencionado en el issue

Si el issue toca código específico, leé esos archivos para entender el estado actual.

---

## Fase 2 — Plan de implementación

Construí un plan claro **antes de tocar código**. El plan debe incluir:

1. **Entendimiento del problema** — qué está pasando y por qué
2. **Archivos a modificar** — lista con ruta y qué cambia en cada uno
3. **Archivos a crear** — si aplica
4. **Enfoque técnico** — decisiones de diseño relevantes, alternativas descartadas y por qué
5. **Tests necesarios** — qué tipo (unitario, E2E) y qué cubren
6. **Criterios de aceptación** — cómo se verifica que el issue está resuelto

Presentá el plan al usuario y **esperá aprobación explícita** antes de continuar.
Si el usuario pide cambios, ajustá el plan y mostralo de nuevo.

---

## Fase 3 — Implementación

Una vez aprobado el plan:

- Usá `TodoWrite` para trackear el progreso task por task
- Implementá en orden lógico, priorizando que cada cambio compile/funcione de forma incremental
- Seguí las convenciones del repo (tokens de `obra/src/lib/tokens.ts`, i18n para strings, shadcn/ui + Tailwind para UI)
- **No hardcodees** colores, strings visibles al usuario, ni estilos inline fuera de los patrones establecidos
- Hacé commits en chunks lógicos, no todo junto al final

```bash
git add <archivos específicos>
git commit -m "tipo(scope): descripción"
```

---

## Fase 4 — Validación con tests

### Tests unitarios

Si el issue modifica lógica de negocio, utilidades, hooks, o funciones puras: escribí o actualizá tests unitarios.

- Ubicación: junto al archivo modificado o en `__tests__/`
- Framework: el que ya use el proyecto (Vitest / Jest)
- Ejecutá los tests para confirmar que pasan:

```bash
cd obra && npm run test -- --run
```

### Tests E2E (Playwright)

Si el issue toca flujos de usuario visibles (formularios, wizards, modales, exportaciones): escribí o actualizá tests E2E.

**Reglas obligatorias** (ver `docs/testing/e2e-patterns.md` para detalle y ejemplos):

- **Selectores:** siempre `data-testid`. Nunca `getByLabel` con texto dependiente de locale.
  - Si el elemento no tiene `data-testid`, agregalo al componente fuente.
  - Naming: `<página>-<elemento>` (ej: `wizard-structure-next-btn`)
- **Waits:** siempre `page.waitForResponse()` atado a la llamada real a la API. Registrá la promesa **antes** del click que la dispara. Nunca `timeout: N` como mecanismo primario de sincronización.
- **AI calls:** auto-interceptadas via `obra/e2e/helpers/test-fixture.ts`. Edge Functions adicionales se interceptan por test con `page.route()`.
- **Aislamiento:** cada test configura y destruye sus propios datos.

Ejecutá los tests E2E para confirmar:

```bash
cd obra && npx playwright test <archivo> --reporter=line
```

---

## Fase 5 — Reporte final

Por cada issue resuelto, reportá:

| Campo | Detalle |
|---|---|
| **Issue** | `#N — Título` |
| **Cambios** | Archivos modificados/creados (paths) |
| **Criterios de aceptación** | ✅ cumplido / ⚠️ parcial / ❌ pendiente (con nota) |
| **Tests** | Tipo, archivo, resultado |
| **Secrets** | Confirmación de que no se commiteó ninguno |

Si algún criterio requiere acceso al dashboard de Supabase, Vercel, o similar, listá los **pasos exactos** que el humano debe ejecutar.

---

## Reglas generales

- **No** termines con "aquí está el prompt para ejecutar en otro lugar"
- **Sí** implementá vos mismo según los criterios del issue
- Preferí cambios pequeños y revisables
- Si algo es imposible sin acceso humano, implementá la parte del repo y documentá los pasos exactos para el humano
- Ante duda entre dos enfoques, elegí el más simple y documentá por qué

---

**Empezá ahora:** leé el issue → construí el plan → presentalo → esperá aprobación → implementá → validá → reportá.
