# BLANKSYS POS

Point-of-sale, inventory and dispatch for a small retail counter. Issue bills,
assign couriers, print thermal receipts, and keep master items and customer
records straight — from the till or from a phone.

**Prototype.** There is no backend. The whole app runs against an in-memory mock
that resets on refresh; sign-in is a client-side flag, not a security boundary.
See [Prototype-grade areas](#prototype-grade-areas) before treating any of it as
production-ready.

---

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000> — you'll land on `/login`.

**Demo credentials** (also printed on the login screen, with a *Fill these in*
button):

```
email     jhony.soda@blanksys.pos
password  blanksys123
```

Requires Node 20+. Built and tested on Node 24.

---

## Scripts

Run from `frontend/`.

| Command | Does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Vitest suite |
| `npm run typecheck` | `next typegen` then `tsc --noEmit` |
| `npm run lint` | ESLint |

`typegen` has to run *before* typecheck: `PageProps`/`LayoutProps` are ambient
types Next.js generates into the gitignored `.next/`, so a bare `tsc --noEmit`
fails on a clean checkout until it has run once.

---

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 5.9 ·
Tailwind CSS v4 · Redux Toolkit + RTK Query · react-icons · Vitest

---

## What's in it

| Route | Screen |
|---|---|
| `/login` | Sign-in |
| `/dashboard` | Metrics, latest transactions, inventory flow |
| `/orders` | Order registry, 3-step POS wizard, thermal receipt |
| `/customers` | Customer directory |
| `/products` | Master items — catalogue, pricing, stock |
| `/couriers` | Dispatch roster |
| `/settings` · `/profile` | Terminal config and operator details |

Each registry has grid and list views, search, pagination, and full CRUD.
The order wizard picks a customer, lets the cashier **override the selling
price per line**, assigns a courier and payment type, then prints a receipt
carrying the price actually charged — not the product's current price.

---

## Layout

`frontend/` follows one rule: every folder has a single responsibility, and an
import states which layer it crosses.

```
app/          routing only — page.tsx is a thin shell over a feature view
features/     one product capability end to end (api, components, hooks, types)
components/   presentational primitives, grouped by category
layouts/      page chrome (sidebar, chrome bar, mobile tab bar)
services/     the data layer — one RTK Query root and the mock backend
store/        Redux wiring and slices
guards/       route-access components (AuthGuard, GuestGuard)
types/        domain models describing backend resources
constants/    route strings, nav config, app-wide literals
utils/        helper/ pure functions · libs/ thin third-party wrappers
theme/        design tokens for the rare case JS needs a raw hex
test/         Vitest suites (not co-located — see below)
```

A feature is reached only through its `index.ts`. Inside it, modules import each
other by path; from outside, `@features/<name>` is the entry point.

Seventeen path aliases are defined in `tsconfig.json` (`@features/*`,
`@components/*`, `@services/*`, …). Note `@app-types/*`, **not** `@types/*` —
TypeScript reserves that prefix for DefinitelyTyped and rejects it with
`TS6137`.

---

## Data layer

One RTK Query root in `services/api/baseApi.ts`. Features add endpoints with
`baseApi.injectEndpoints({...})` — never a second `createApi`, never a raw
`fetch`. Cache tags live in `services/api/tags.ts`; a tag missing from that list
is silently ignored by RTK Query, so add it there first.

`services/mock/` is the in-memory stand-in. Endpoints use `queryFn` against
`mockDb` instead of `query`.

**To move to a real API:** swap `fakeBaseQuery()` for
`fetchBaseQuery({ baseUrl })` and convert each `queryFn` to a `query`. Endpoint
call sites don't change, and `types/` stays as-is — that is the point of keeping
domain models out of `services/mock/`.

Two mock behaviours worth knowing:

- **Read latency.** `READ_LATENCY_MS` (280 ms) in `services/mock/utils.ts` makes
  `isLoading` real. Without it every skeleton in the app would be dead code
  nobody ever sees. Delete it when a real API supplies its own latency.
- **Fault injection.** Error states are only trustworthy if the failure path is
  reachable. From the browser console:

  ```js
  __blanksysMock.failReads(true)   // every read now fails
  __blanksysMock.failReads(false)  // back to normal
  ```

  Each screen then shows its error state with a working **Try again**.

---

## Design system

Tokens live once in `frontend/app/globals.css` and are mirrored as raw hex in
`frontend/theme/colors.ts` for charts and canvas. **Don't hardcode colours in
components** — `bg-slate-50` doesn't respond to theming, `bg-surface` does.

[`frontend/docs/theme.md`](frontend/docs/theme.md) documents which token to use
where, the card and modal anatomy, hover behaviour, and what was deliberately
left out.

Dark-mode tokens exist and the `dark` class is wired through the whole palette,
but **no toggle is installed** — `next-themes` is not a dependency yet.

---

## Testing

Vitest, config in `vitest.config.mts`. Aliases resolve from `tsconfig.json` via
Vite's native `resolve.tsconfigPaths`, so the seventeen paths are never
duplicated into a second mapping.

**Suites live in `test/`, not co-located.** A `*.test.tsx` inside `features/`
would be picked up by `tsconfig.json`'s `**/*.tsx` include and by the Next.js
build graph, so test-only imports would be typechecked as production code.

Current coverage is the mock backend's id generation — the invariant behind a
real bug where a generated id collided with a seeded one and React rendered two
rows under the same key. Worth extending to the endpoints and feature views once
there is a real API to test against.

---

## Prototype-grade areas

- **Auth is not a security boundary.** `AuthGuard` runs in the browser and every
  page is statically rendered. It hides UI; it does not protect data. Real
  enforcement belongs on the API. The session sits in `sessionStorage` so a
  shared till forgets the operator when the tab closes.
- **Data is in-memory** and resets on a full page load. `resetDatabase()` in
  `services/mock/seed.ts` restores the seed on demand.
- **Pagination slices client-side.** The mock returns every row; there is no
  `page`/`pageSize` param yet. `usePagination`'s return shape is designed to keep
  call sites unchanged when a real backend paginates server-side.
- **Settings don't persist.** The form edits local state; there is no settings
  endpoint behind it.
- **Popular Items on the dashboard is static.** Nothing aggregates historical
  sales volume, so those figures are placeholders — and are marked as such in
  the code rather than presented as computed.
- **Security headers are not set.** `next.config.ts` only disables
  `X-Powered-By`. Before any real deployment this needs
  `X-Frame-Options: DENY` (it's a portal on a supplier-controlled domain, which
  is exactly what clickjacking targets), `X-Content-Type-Options`,
  `Referrer-Policy` and HSTS. A useful CSP additionally needs a per-request
  nonce threaded through `middleware.ts`.

---

## Conventions

- React files `PascalCase.tsx`, other modules `camelCase.ts`, types
  `<domain>.types.ts`, mocks `<domain>.mock.ts`.
- A barrel (`index.ts`) re-exports; it never defines.
- `react-icons/lu` is the only icon source. Components take an `icon?: IconType`
  prop rather than a `ReactNode`, so every icon renders through the same wrapper.
- Tailwind utilities only. `style={{}}` is reserved for values computed at
  runtime.
