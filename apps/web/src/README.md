# apps/web/src

Source of the OnePlate interface. `app/index.html` (the claude.ai artifact build) is generated from these files by `node scripts/build-app.mjs`; never edit it by hand. CI fails if it drifts.

| File | Holds |
|---|---|
| `head.html` | title, viewport meta, font link |
| `styles.css` | design tokens, layout, components, Urdu/RTL rules |
| `markup.html` | the app shell: top bar, main, tabs, toast, info sheet |
| `js/NN-*.js` | classic scripts concatenated in the order listed in `build-order.json` (phase 2 step 1: one global scope, split by section; step 2 converts them to ES modules importing `@oneplate/core` and `@oneplate/content`) |

Rebuild after any change:

```bash
node scripts/build-app.mjs          # writes app/index.html
pnpm --filter @oneplate/web build   # also builds the PWA in apps/web/dist
```
