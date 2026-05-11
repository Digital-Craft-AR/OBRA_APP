# Fase 5 — Subagente de code review

Este archivo documenta cómo ejecutar el paso de revisión independiente de código.

## Objetivo

Una **perspectiva fresca** sobre el diff. El subagente no vio tu razonamiento, tus tradeoffs, ni tus defensas del diseño. Lee el issue, las convenciones y el diff en frío — y te dice qué está mal.

El punto no es validación. El punto es surfear cosas que vos te perdiste.

## Template del prompt para el subagente

Spawneá el subagente (via la herramienta `Agent`) con este prompt. Completá las partes entre corchetes.

> Estás revisando un pull request del repositorio `Digital-Craft-AR/OBRA_APP`.
>
> **Issue que se está resolviendo**:
> ```
> [pegá título + cuerpo del issue]
> ```
>
> **Convenciones del proyecto** (leé en su totalidad antes de revisar):
> - `CONVENCIONES.md`
> - `CLAUDE.md`
> - `ARQUITECTURA_Obra.md` (solo las reglas arquitectónicas)
>
> **El diff**:
> ```
> [pegá el output de `git diff` contra la rama base, o listá los archivos modificados para que el subagente los lea]
> ```
>
> **Tu tarea**: revisá este cambio de forma crítica. No halagues. Asumí que el autor estaba cansado y pudo haber cortado caminos. Buscá:
>
> 1. **Correctness**: ¿el código realmente hace lo que pide el issue? ¿Los criterios de aceptación están cumplidos?
> 2. **Violaciones de convenciones**: cualquier cosa que rompa `CONVENCIONES.md` o patrones establecidos en el resto del repo.
> 3. **Seguridad**: secrets, injection, gaps de authz/authn, defaults inseguros, riesgos de dependencias.
> 4. **Tests**: ¿son significativos? ¿Ejercitan el comportamiento real, o solo el happy path?
> 5. **Mantenibilidad**: naming, complejidad, dead code, error handling faltante.
> 6. **Scope creep o gaps**: cambios no relacionados al issue, o partes del issue no abordadas.
>
> Devolvé tus hallazgos en esta estructura exacta:
>
> ```
> ## Must-fix
> - [hallazgo] — [por qué importa] — [archivo:línea]
>
> ## Should-fix
> - [hallazgo] — [por qué importa] — [archivo:línea]
>
> ## Nit
> - [hallazgo] — [archivo:línea]
>
> ## Overall
> [1-3 oraciones: ¿este PR está listo, casi listo, o necesita rework significativo?]
> ```
>
> Si una categoría está vacía, escribí `(ninguno)`. No inventes issues para llenarla.

## Reglas de reconciliación (agente principal)

Luego de que el subagente devuelva su revisión:

- **Must-fix**: aplicá el cambio. Si no estás de acuerdo, escribí *por qué el subagente está equivocado* antes de saltearlo — y surfacéale ese desacuerdo al usuario. El default es aplicar.
- **Should-fix**: aplicá si el cambio es pequeño y el razonamiento es sólido. Salteá si agrega scope significativo o contradice el issue. Documentá la decisión de todas formas.
- **Nit**: a criterio. Aplicá los baratos; salteá el resto.

Después de aplicar cambios del review, **re-corré el test suite**. Cualquier cosa que el subagente señaló y que no estaba cubierta por un test es candidata a un test nuevo.

## Reporte al usuario

Mostrá al usuario un resumen compacto:

```
Review del subagente:
- Must-fix: N hallazgos → aplicados N, salteados N (con razones)
- Should-fix: N hallazgos → aplicados N, salteados N (con razones)
- Nit: N hallazgos → aplicados N
- Veredicto overall: [one-liner del subagente]
- Tests re-corridos: pass / fail
```

No enterrés el review. El usuario tiene que verlo antes del gate de Confirmar.
