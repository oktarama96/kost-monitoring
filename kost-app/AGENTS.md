# AGENTS.md — AI Agent Guidelines for KostManager

## What Is This Project?

**KostManager** is a **multi-tenant SaaS** web application for managing Indonesian boarding houses (*kost*). Each owner account manages one kost. A **SuperAdmin** role manages all owner accounts.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Vercel Postgres · NextAuth.js v5

**Always read these first before making any changes:**
- [`SPECS.md`](./SPECS.md) — Business logic, feature specs, domain rules, user roles
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — File structure, DB schema, API reference, auth flow, data flow

---

## 🔴 Mandatory Sync Rule

> **After ANY change to the codebase — feature, bug fix, refactor, or schema change — you MUST update `SPECS.md` and `ARCHITECTURE.md` to reflect those changes before considering the task complete.**

Specific update triggers:

| Change Type | Update Target |
|---|---|
| New or changed feature / behavior | Relevant section in `SPECS.md` |
| New file, route, module, or component | Directory tree + relevant sections in `ARCHITECTURE.md` |
| Database schema change | Section 4 (DB Schema) in `ARCHITECTURE.md` + Section 3 or 5 in `SPECS.md` |
| New API endpoint | Section 7 (API Routes) in `ARCHITECTURE.md` |
| New env variable or external service | Section 10 (Environment) in `ARCHITECTURE.md` |
| New business rule or constraint | Section 3 or 10 in `SPECS.md` |
| New npm dependency | Section 1 (Tech Stack) in `ARCHITECTURE.md` |
| New user role or auth rule | Section 4 (Roles) in `SPECS.md` + Section 5 (Auth) in `ARCHITECTURE.md` |

---

## Codebase Quick Reference

### Layout & Entry Points

| Path | Description |
|---|---|
| `app/layout.tsx` | Minimal root layout — Providers + Toaster only, **NO Navbar** |
| `app/(owner)/layout.tsx` | Owner route group layout — wraps with Navbar + main container |
| `app/(owner)/page.tsx` | Dashboard (Server Component, SSR) |
| `app/(owner)/rooms/page.tsx` | Room + tenant management (Client) |
| `app/(owner)/billing/page.tsx` | Meter input (Client) |
| `app/(owner)/billing-list/page.tsx` | Bill management (Client) |
| `app/admin/layout.tsx` | Admin layout — **independent** header, no root Navbar nesting |
| `app/admin/page.tsx` | Owner CRUD for SuperAdmin (Client) |
| `app/login/page.tsx` | Login page (public) |
| `app/register/page.tsx` | Registration page (public) |

### Core Logic Files

| File | Purpose |
|---|---|
| `lib/types.ts` | All TypeScript interfaces (`User`, `Kost`, `Room`, `Tenant`, `Bill`, `OwnerWithKost`, etc.) |
| `lib/db.ts` | **All** database queries — never write SQL directly in route handlers |
| `lib/helpers.ts` | Pure business logic: bill calculation, formatting, ID generation, bill text |
| `lib/utils.ts` | `cn()` Tailwind class merger |
| `auth.ts` | NextAuth v5 config: Credentials provider, JWT callbacks (injects `id` + `role`) |
| `middleware.ts` | Route protection + role-based access (owner vs superadmin) |
| `types/next-auth.d.ts` | Module augmentation: adds `id` and `role` to `Session` and `JWT` |

### API Structure

```
/api/auth/[...nextauth]      — NextAuth handler (public)
/api/auth/register           — POST: create owner account (public)
/api/admin/setup             — POST: create first superadmin (public, one-time)
/api/admin/owners            — GET/POST: list/create owners (superadmin)
/api/admin/owners/[id]       — PATCH/DELETE: update/delete owner (superadmin)
/api/rooms                   — GET (w/ active_tenant)/POST: owner scoped
/api/rooms/[id]              — PUT/DELETE
/api/rooms/[id]/last-meter   — GET: previous month meter_end
/api/rooms/[id]/checkin      — POST: check in new tenant
/api/rooms/[id]/checkout     — POST: check out tenant + expire bills
/api/rooms/[id]/tenants      — GET: tenant history
/api/bills                   — GET/POST (upsert, snapshots tenant name)
/api/bills/[id]              — PATCH (toggle paid/unpaid) / DELETE
```

---

## Key Conventions

### Authentication & Sessions
- All owner API routes must call `const session = await auth()` and verify `session?.user?.id`.
- SuperAdmin API routes additionally check `session.user.role === "superadmin"`.
- Never trust client-supplied `kost_id` — always derive it from `getKostByUserId(session.user.id)`.

### Database Access
- **All SQL goes in `lib/db.ts`** — no inline SQL in route handlers or components.
- Use the `sql` tagged template literal from `@vercel/postgres`.
- `getUserByEmail` must SELECT the `role` column.
- Room IDs: `room-{timestamp}` | Bill IDs: `bill-{MM}{YYYY}-room{N}` (via `generateBillId()`)

### Data Isolation (Multi-Tenancy)
- Every room/bill query must be scoped by `kost_id`. Pass it from the session, not from the client.
- `GET /api/rooms` returns rooms with embedded `active_tenant`.

### Tenant Lifecycle
- Check-in: `POST /api/rooms/[id]/checkin` → `checkinTenant()` in db.ts
- Check-out: `POST /api/rooms/[id]/checkout` → `checkoutTenant()` → also expires unpaid bills
- Active tenant = record with `check_out_date IS NULL`

### Bill Status
- `status` is a `VARCHAR(16)`: `'unpaid'` | `'paid'` | `'expired'`
- `expired` bills cannot be toggled. Block in both API (`PATCH /api/bills/[id]`) and UI.
- On bill creation, snapshot the active tenant's name into `tenant_snapshot_name`.

### Business Logic
- `total_amount = base_price + monthly_fee + (kwh_used × price_per_kwh)` — always via `calculateBillAmount()` in `helpers.ts`.
- Bills are upserted via `ON CONFLICT (room_id, month, year) DO UPDATE`.

### API Patterns
- Responses: `NextResponse.json(data, { status: N })`
- Errors: `{ error: string }` with 4xx/5xx HTTP status
- Auth failures: 401 Unauthorized | Role failures: 403 Forbidden

### Component Patterns
- Interactive pages: `"use client"` at the top
- shadcn/ui only — no alternate UI libraries
- Toast: `toast.success()` / `toast.error()` via Sonner
- Import alias: `@/` = project root

### Route Groups
- `app/(owner)/` — Next.js route group, URL is unaffected (e.g., `/(owner)/rooms` serves `/rooms`)
- Adding a new owner page: create under `app/(owner)/` not `app/` root
- `app/admin/` is a standalone segment with its own independent layout

---

## Adding New Features — Checklist

1. **Read `SPECS.md`** — understand business rules before writing code
2. **Read `ARCHITECTURE.md`** — understand where new code belongs
3. **Plan DB changes** — add to `scripts/migrate.sql` if schema changes
4. **Add DB functions** to `lib/db.ts` (before route handlers)
5. **Add business logic** to `lib/helpers.ts` (pure functions)
6. **Add/update API routes** in `app/api/`
7. **Build UI** under `app/(owner)/` (owner pages) or `app/admin/` (admin pages)
8. **✅ Update `SPECS.md`** with new feature spec
9. **✅ Update `ARCHITECTURE.md`** with structural changes

---

## Common Tasks

### Add a New Room Field
1. `scripts/migrate.sql` → `ALTER TABLE rooms ADD COLUMN ...`
2. `lib/types.ts` → Update `Room` interface
3. `lib/db.ts` → Update `createRoom`, `updateRoom`, `getRooms`
4. `app/api/rooms/route.ts` and `app/api/rooms/[id]/route.ts`
5. `app/(owner)/rooms/page.tsx` → Update form UI
6. ✅ Sync `SPECS.md` (§5.3) and `ARCHITECTURE.md` (§4, §6)

### Add a New Owner Page
1. Create `app/(owner)/{page-name}/page.tsx`
2. Add nav link in `components/Navbar.tsx`
3. Add API routes under `app/api/`
4. Add DB functions in `lib/db.ts`
5. ✅ Sync `ARCHITECTURE.md` (§2 directory tree, §7 API, §8 rendering) and `SPECS.md` (§5)

### Add a New API Endpoint
1. Create route file under `app/api/`
2. Add DB function(s) in `lib/db.ts`
3. ✅ Sync `ARCHITECTURE.md` §7 (API Routes Reference)

### Change Bill Calculation
1. Update `calculateBillAmount()` in `lib/helpers.ts`
2. Verify callers: `app/api/bills/route.ts`, billing page live preview
3. ✅ Sync `SPECS.md` §3.1

### Modify Auth/Role Behavior
1. Update `auth.ts` (callbacks) and/or `middleware.ts`
2. If new role: update `types/next-auth.d.ts` + `lib/types.ts`
3. ✅ Sync `SPECS.md` §4 and `ARCHITECTURE.md` §5

---

## What NOT to Do

- ❌ Write SQL directly in route handlers — always use `lib/db.ts`
- ❌ Trust client-supplied `kost_id` — derive from session
- ❌ Toggle `expired` bills — blocked at API + UI level
- ❌ Use `is_paid` — the field is `status` (string enum)
- ❌ Read `tenant_name` from rooms — tenants are tracked in the `tenants` table
- ❌ Create new owner pages under `app/` root — use `app/(owner)/`
- ❌ Nest admin-specific UX inside the root layout — `app/admin/layout.tsx` is fully independent
- ❌ Forget to update `SPECS.md` and `ARCHITECTURE.md` after any change
