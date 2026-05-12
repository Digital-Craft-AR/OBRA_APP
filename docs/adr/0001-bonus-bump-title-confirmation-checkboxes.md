# Bonus/bump title step: checkboxes replace lock icons

The lock-icon affordance on the bonus/bump title step was ambiguous — users didn't intuitively understand what clicking a padlock did, causing good AI-suggested titles to be overwritten unintentionally. We replaced the lock icons with checkboxes using **positive framing**: checked = "I'm keeping this title." The underlying mechanic is identical (checked rows are excluded from batch regeneration), but the widget and mental model are more natural for a selection task.

## Resolved interaction details

- **Checkbox position:** left of each row (standard list-selection pattern).
- **Auto-check on blur:** typing in a title field auto-checks the row on blur (not on each keystroke) to protect manual edits from batch regeneration without a jarring mid-type state change.
- **Regenerate on checked row:** clicking ↺ on a checked row automatically unchecks it and regenerates — no two-step dance of "uncheck then regenerate."
- **Default state:** unchecked after AI generates (user must confirm, not opt out).
- **Button rename:** "Regenerate all" → "Regenerate remaining" to accurately reflect that checked rows are skipped.
- **Disabled state:** "Regenerate remaining" is disabled when all rows are checked (prevents a confusing no-op).

## Considered alternatives

Lock icons (current) were kept as an option; rejected because the `LockOpen`/`Lock` toggle is a power-user affordance that doesn't communicate "I'm done with this row" clearly to non-technical creators.
