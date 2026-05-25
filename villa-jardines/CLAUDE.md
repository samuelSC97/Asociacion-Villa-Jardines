# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A vanilla JS single-page application (SPA) for **Asociación de Vecinos Villa Jardines** (Arequipa, Perú). It manages attendance, fines, payments, and documents for 77 neighbors. There is no build step, no npm, no framework — just static HTML/CSS/JS deployed to Netlify with Supabase as the backend.

## Running the app

Open `index.html` directly in a browser, or serve it over HTTP (required for Supabase calls):

```
# Using VS Code Live Server extension (recommended)
# Or any static server, e.g.:
npx serve .
python -m http.server 8080
```

The VS Code launch config targets `http://localhost:8080`.

## Architecture

**Single HTML file, multiple screens.** `index.html` defines three `.screen` divs (`#s-login`, `#s-admin`, `#s-vecino`). Only one has class `active` at a time. `showScreen(id)` in `utils.js` swaps which one is visible.

**Script load order matters.** `index.html` loads scripts in this sequence — later scripts depend on earlier ones:

```
config.js → utils.js → modal.js → auth.js
→ admin/inicio.js … admin/index.js
→ vecino/inicio.js … vecino/index.js
→ app.js
```

**Module pattern.** Every module is an IIFE assigned to a global: `const Auth = (() => { ... })()`. Modules expose only their public API. No import/export syntax — globals are the interface.

**Shared globals (from `config.js`):**
- `db` — Supabase client instance
- `MULTAS` — `{ A: 25, F: 50, I: 100 }` fine amounts by event type
- `MESES` / `MESES_L` — short and long month name arrays

**Shared globals (from `utils.js`):** `showLoading()`, `hideLoading()`, `showScreen(id)`, `today()`, `formatFecha(f)`, `tipoLabel(t)`, `tipoColor(t)`, `initials(name)`

**Tab routing.** `AdminApp.tab(name)` and `VecinoApp.tab(name)` switch between sections by calling `render()` on the corresponding module and updating nav button active state.

**Destructive actions** require password confirmation via `Modal.pedir(mensaje, callback)` — it re-authenticates against `usuarios` table before executing the callback.

## Authentication

- **Admin:** username + plaintext password checked against `usuarios` table (`rol = 'admin'`)
- **Vecino:** DNI lookup (no password) — read-only access to their own data only

Passwords are stored as plaintext in the `usuarios` table (no hashing in the current implementation).

## Database (Supabase)

**Project:** `https://qigygiskmpbmpqnggurq.supabase.co`  
**Key:** stored in `js/config.js` (anon/public key)

Key tables and their purpose:
| Table | Purpose |
|---|---|
| `vecinos` | 77 neighbors with DNI, phone, role, mz/lote |
| `eventos` | Assemblies, faenas, important events |
| `asistencias` | P/F/J attendance per vecino+event |
| `subsanaciones` | Justifications linked to apoyos |
| `apoyos` | Guardadito savings and applied apoyos |
| `pagos_cuota_mes` | S/2/month storage fee |
| `cuotas_sociales` | S/24/year (partial payments allowed) |
| `otros_pagos` | Custom payment types |
| `otros_pagos_vecinos` | Who paid each custom payment |
| `documentos` | Uploaded PDFs (actas, etc.) |
| `agenda_proxima` | Next meeting announcement |
| `usuarios` | Admin login credentials |

Fine amounts: Asamblea = S/25, Faena = S/50, Importante = S/100.

## Mantener el README actualizado
Cuando se implemente una mejora significativa, se reemplace una funcionalidad o se cambie la arquitectura, actualiza la sección correspondiente del `README.md`. Si ya existe una sección relevante, edítala en lugar de agregar al final. Si el cambio reemplaza algo, el texto antiguo también se reemplaza para que el README siempre tenga sentido para quien lo lee.

## Adding a new admin section

1. Create `js/admin/nueva-seccion.js` with the IIFE pattern: `const AdminNuevaSeccion = (() => { async function render() { ... } return { render }; })()`
2. Add the `<script>` tag in `index.html` before `js/admin/index.js`
3. Add the tab name to `TABS` and module to `MOD` in `js/admin/index.js`
4. Add a `<button>` in the `#admin-nav` in `index.html`
