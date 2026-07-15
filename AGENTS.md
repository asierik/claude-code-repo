# MealMate — project handoff for AI agents

A collaborative **meal-planning + grocery** web app (installable PWA), built in a
workshop. This file is the single source of truth for picking the project up.
Read it fully before changing code. There is also a `CLAUDE.md` with a hard rule:
**verify any change by driving a real browser via the `playwright-cli` skill.**

Status: **feature-complete for the MVP and verified end-to-end in the browser.**
The original product spec is in `specs.txt`.

---

## 1. What it does

- **Accounts**: register / login, cookie session (scrypt-hashed passwords).
- **Spaces**: every user owns a "space" (their kitchen). A space holds dishes, a
  calendar plan, and a derived grocery list.
- **Dishes**: a *dish* is just a **name + ingredients + tags** — deliberately **no
  cooking instructions** (that's why it's "dish", not "recipe"; see §7). Create/
  edit/delete, filter by text (name or ingredient) or by tag.
- **Calendar**: week view; each day has 3 optional slots — breakfast / lunch /
  dinner — and you assign one dish per slot.
- **Grocery list**: auto-aggregated from the ingredients of every meal planned
  **from today onward**. Tick items off (persisted per space; checked items sink
  to the bottom).
- **Sharing / collaboration**: a space owner shares with another user by username;
  collaborators get **full co-edit** access. You only ever see spaces you own or
  were shared into (privacy enforced server-side). A space switcher in the top bar
  changes the active space.

---

## 2. Quickstart

```bash
# Backend deps (frontend deps are under web/)
npm install
cd web && npm install && cd ..

# Build the Angular app (Express serves the compiled output — see §4)
cd web && npx ng build && cd ..

# Run (serves API + built app on one origin)
node server.js                  # http://localhost:3000
# or: npm start

# Env vars (can be stored in a `.env` file; `server.js` loads `dotenv`)
PORT=3000                       # default 3000
MEALMATE_DB=/path/to/file.db    # default ./mealmate.db (local fallback)
TURSO_DATABASE_URL=libsql://... # optional: Turso/libSQL URL for remote DB
TURSO_AUTH_TOKEN=...            # optional: Turso auth token (when required)
COOKIE_SECURE=true              # optional: set to force Secure cookie (or set NODE_ENV=production)
```

**Important: there is no `ng serve` in the normal loop.** Express serves the
*built* Angular output from `web/dist/web/browser`. After any change under
`web/src`, you must re-run `npx ng build` (or `npx ng build --watch`) and reload
the browser. Backend changes just need a `node server.js` restart.

---

## 3. Tech stack

| Layer    | Choice | Notes |
|----------|--------|-------|
| Runtime  | Node 26 | uses `@libsql/client` for Turso (HTTP/WS/file) with an optional local file fallback |
| Backend  | Express 4.22 (ESM, `"type":"module"`) | layered, see §4 |
| DB       | Turso / libSQL via `@libsql/client` (remote) with optional local `file:` fallback | client exposes async `execute` / `migrate` / `batch` APIs |
| Frontend | Angular 22 standalone + **signals** | no NgModules, no router (signal-based tab switch) |
| Auth     | `node:crypto` scrypt + random session token cookie | no external auth lib |
| Deploy   | Render free-tier Node web service | see §9 |

There is **one** runtime npm dependency on the backend (`express`) plus `@libsql/client`; the code now uses `@libsql/client` for database access and `dotenv` for environment variables. Crypto and cookies remain Node built-ins.

---

## 4. Architecture

### Backend — strict layering (dependencies point downward only)

```
routes/        HTTP only: parse req, call a service, send res. NO SQL.
  └─ services/   business logic + validation; throw AppError(status,msg). NO Express, NO SQL.
       └─ repositories/   the ONLY files that touch SQL (now use async helpers over @libsql/client).
middleware/    requireAuth (session→req.user), requireSpace (access control→req.space/req.role), errorHandler
util/          errors (AppError + helpers), password (scrypt), cookies (parse/set/clear), asyncHandler (wrap async Express handlers)
db/            connection (the single libSQL/Turso Client), schema (async migrate() using executeMultiple / migrate)
app.js         builds the Express app, mounts routers, serves web/dist, SPA fallback, errorHandler last
server.js      entry: migrate() then listen()
```

- Services throw `AppError(status, message)` (see `src/util/errors.js`). Handlers
  are synchronous (sqlite is sync), so Express catches throws and routes them to
  `errorHandler`, which emits `{ error: message }` with the status. **Don't
  try/catch in routes** — just let services throw.
- Access control is centralized: every space-scoped router does
  `router.use(requireAuth, requireSpace)`. `requireSpace` calls
  `spaceService.requireAccess()` which 404s unknown spaces and 403s non-members.
  This is what enforces the spec's privacy rule — keep it on every space route.

### Frontend — Angular standalone + signals

```
app.ts            root: shows <app-auth> or <app-shell> based on auth.user(); calls auth.loadMe() once
app.config.ts     providers: provideHttpClient() (fetch is default in v22)
core/             services (all `providedIn:'root'`) + models.ts
  api.service        promise wrapper over HttpClient; unwraps {error} → throws Error
  auth.service       user() + ready() signals; login/register/logout/loadMe
  space.service      spaces() + activeId() + active() signals; load/setActive/members/share
  dish/plan/grocery.service   thin per-feature API calls, scoped by spaceId
auth/             login+register screen
shell/            top bar (space switcher + 🔗 share modal + logout), bottom tab bar,
                  signal-based view switch (calendar | dishes | grocery)
calendar/         week view, slot picker (centered sheet)
dishes/           list + filter + add/edit form (centered sheet)
grocery/          checklist
```

- **State pattern**: feature components read `space.activeId()` inside an
  `effect()` and reload when it changes. The shell uses `@switch` so switching
  tabs destroys/recreates a feature component → it reloads on every tab enter
  *and* on space change. There's no client-side router.
- **No NgModules.** Every component is `standalone` with an `imports: [...]`.
- Same-origin: the Angular app calls `/api/...`, served by the same Express
  process, so the session cookie just works (no CORS, no `withCredentials`).

---

## 5. Data model (`src/db/schema.js`)

```
users(id, username UNIQUE, pass_hash, salt, created_at)
sessions(token PK, user_id, created_at)
spaces(id, name, owner_id, created_at)
space_members(space_id, user_id, role)   role = 'owner' | 'member'   PK(space_id,user_id)
dishes(id, space_id, name, ingredients JSON, tags JSON, created_by, created_at)
plan_entries(id, space_id, date 'YYYY-MM-DD', slot, dish_id)   UNIQUE(space_id,date,slot)
grocery_checked(space_id, item_key)   PK(space_id,item_key)   item_key = lowercased ingredient name
```

- `dishes.ingredients` is JSON `[{name, amount}]`; `dishes.tags` is JSON `["quick"]`.
  The **repository** parses/stringifies these — services/routes see real arrays.
- **No migration system.** Schema is `CREATE TABLE IF NOT EXISTS`. If you change a
  column/table, **delete the dev DB** (`rm mealmate.db*`) so it recreates.

---

## 6. API reference (all under `/api`)

| Method | Path | Body / notes |
|--------|------|--------------|
| GET  | `/health` | `{ok:true}` |
| POST | `/register` | `{username,password}` → sets session cookie, `{user}` |
| POST | `/login` | `{username,password}` |
| POST | `/logout` | clears cookie |
| GET  | `/me` | current user or 401 |
| GET  | `/spaces` | spaces you can access (own + shared), with `role`, `owner` |
| GET  | `/spaces/:spaceId/members` | |
| POST | `/spaces/:spaceId/share` | `{username}` — owner only |
| GET  | `/spaces/:spaceId/dishes` | |
| POST | `/spaces/:spaceId/dishes` | `{name, ingredients:[{name,amount}], tags:[]}` |
| PUT  | `/spaces/:spaceId/dishes/:did` | |
| DELETE | `/spaces/:spaceId/dishes/:did` | |
| GET  | `/spaces/:spaceId/plan` | all plan entries (with `dish_name`) |
| PUT  | `/spaces/:spaceId/plan` | `{date, slot, dish_id}`; `dish_id:null` clears the slot |
| GET  | `/spaces/:spaceId/grocery` | aggregated list for meals dated today→future |
| POST | `/spaces/:spaceId/grocery/check` | `{item_key, checked}` |

`slot` ∈ `breakfast|lunch|dinner`. Every `/spaces/:spaceId/...` route requires a
session and membership.

---

## 7. Key decisions (and why) — don't silently reverse these

- **"dish", not "recipe"**: the entity has no instructions, just name+ingredients.
  The whole stack (DB table `dishes`, `dish_id`, `DishService`, UI "Dishes") uses
  this term. Picked by the product owner.
- **Grocery cutoff = "everything from today onward"**: `groceryService.buildList`
  includes any entry with `date >= local today` (date-only; time of day is
  ignored). An earlier version used per-slot times — that was **intentionally
  dropped**.
- **Sharing = full co-edit** of the whole space (not read-only, not per-list).
- **Ingredient amounts are free text** (`"500g"`, `"1 jar"`) and the grocery list
  just lists them side by side — **no unit math** (no `500g+500g→1kg`). This is a
  known, accepted simplification.
- **Modals are centered cards** (`.scrim`/`.sheet` in `web/src/styles.css`), not
  bottom sheets.
- **CSS uses design tokens, no magic numbers.** `web/src/styles.css` defines a
  `:root` token system (spacing/radius/type/size/z/shadow scales); rules reference
  `var(--...)`. Keep it that way — don't hardcode px in styles or templates (only
  structural literals like `0`, `1px`, `50%`, `100%` are allowed bare).
- **Free hosting is a hard constraint** — the owner does not want paid deploys.

---

## 8. Testing — browser e2e via `playwright-cli` (required by CLAUDE.md)

Start the server, then drive it headed: `playwright-cli open --headed http://localhost:3000/`.
Smoke-test path: register → add a dish (2 ingredients + tags) → assign to a
today/future dinner slot → check Grocery shows the ingredients → tick one off →
reload to confirm persistence → second browser session (`playwright-cli -s=bob …`)
to verify privacy (403 before share) and collaboration (visible after share).

**playwright-cli gotchas learned the hard way:**
- Element **refs (`e12`) renumber on every new snapshot.** Prefer stable locators:
  `getByRole(...)`, `getByText(...)`, or CSS classes — not refs across commands.
- `getByPlaceholder('Ingredient')` is **substring + case-insensitive**, so it also
  matches the "Search name or **ingredient**…" box → strict-mode violation. Use
  form-only classes like `.ing-row:nth-of-type(n) .ing-name`.
- `.gitem` text filters collide because dish names repeat in the sub-text; target
  by index (`.nth(0)`) instead.
- The startup `GET /api/me` 401 in the console is **expected** (no session yet).

You can also smoke the API directly with `curl` (cookie jar) before/instead of the
browser — see git history / the layered routes.

---

## 9. Deployment (free, no paid hosting)

**Now deployed on Render** (free-tier Node web service), not a local tunnel
anymore — the earlier Cloudflare quick-tunnel setup is retired.

- Render builds with `npm run build` (installs backend deps, then builds the
  Angular app under `web/`) and starts with `npm start` (`node server.js`) —
  the existing `package.json` scripts (see §2) work as-is, no Render-specific
  config file needed.
- The DB is **Turso/libSQL** (remote), not a local SQLite file, so the app has
  no local state to lose on redeploy/restart.
- Env vars are set in the Render dashboard, not a committed `.env`:
  `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NODE_ENV=production` (or
  `COOKIE_SECURE=true`) so session cookies get `Secure`. `PORT` is supplied by
  Render itself.
- The app gets a stable `https://<service-name>.onrender.com` URL (unlike the
  old tunnel's random URL that changed on every restart) — that's what gets
  added to the phone home screen (manifest + `sw.js` make it installable).
- **Free-tier caveat:** the service spins down after inactivity, so the first
  request after idle time has a noticeable cold-start delay while it spins
  back up. Nothing to fix — just expect a slow first load when testing after
  a gap.

---

## 10. Known limitations / next steps

- No quantity/unit math in the grocery list (free-text amounts only).
- No live multi-device sync — collaborators see changes on **reload/poll**, not in
  real time. Add SSE/WebSocket if needed.
- No migration system; schema changes need a DB reset.
 - Cookies are `SameSite=Lax`. For real HTTPS deployments the app now sets `Secure` when `NODE_ENV=production` or `COOKIE_SECURE=true` (see `src/util/cookies.js`). This keeps local dev on `http://localhost` working while enforcing secure-only cookies in production.
- No automated test suite — verification is manual via `playwright-cli`.
- Calendar is week-only (no month view / drag-and-drop).
- A minimal pass-through service worker (`web/public/sw.js`) exists only to satisfy
  installability; it does **not** cache or enable offline use.

---

## 11. TL;DR for an agent making a change

1. Backend change → edit the right layer (route/service/repo), restart `node server.js` (the server now awaits async `migrate()` at startup).
2. Env: set `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` for Turso or `MEALMATE_DB` for local file; the app loads `.env` via `dotenv`.
3. Frontend change → edit `web/src/...`, **`cd web && npx ng build`**, reload.
4. Schema change → update `src/db/schema.js` (use `executeMultiple`/`migrate` when targeting remote libSQL), `rm mealmate.db*` for a fresh local DB, restart.
4. **Verify in a real browser with `playwright-cli` before claiming done** (CLAUDE.md).
5. Respect §7 decisions and the design-token rule (§7).
