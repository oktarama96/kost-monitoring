# KostManager — Architecture Overview

## 1. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.x |
| Runtime | React | 19 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS v4 | latest |
| UI Components | shadcn/ui (New York style) + Radix UI | latest |
| Icons | Lucide React | latest |
| Toast Notifications | Sonner | latest |
| Authentication | NextAuth.js v5 (beta) | 5.x |
| Password Hashing | bcryptjs | latest |
| Database | PostgreSQL via Vercel Postgres (`@vercel/postgres`) | latest |
| Fonts | Geist Sans, Geist Mono (Next.js font optimization) | latest |
| Deployment | Vercel | — |

---

## 2. Project Directory Structure

```
kost-app/
├── app/                              # Next.js App Router root
│   ├── layout.tsx                    # Minimal root layout: HTML shell, Providers, Toaster (NO Navbar)
│   ├── globals.css                   # Tailwind imports + CSS design tokens
│   ├── favicon.ico
│   │
│   ├── (owner)/                      # Route group: owner-facing pages (requires login as owner)
│   │   ├── layout.tsx                # Owner layout: wraps with Navbar + main container
│   │   ├── page.tsx                  # Dashboard (Server Component, force-dynamic)
│   │   ├── rooms/
│   │   │   └── page.tsx              # Room + tenant management (Client Component)
│   │   ├── billing/
│   │   │   └── page.tsx              # Monthly billing input (Client Component)
│   │   └── billing-list/
│   │       └── page.tsx              # Billing history & management (Client Component)
│   │
│   ├── admin/                        # SuperAdmin panel (requires role=superadmin)
│   │   ├── layout.tsx                # Admin layout: independent header + main (NO root Navbar)
│   │   └── page.tsx                  # Owner CRUD (Client Component)
│   │
│   ├── login/
│   │   └── page.tsx                  # Login page (public)
│   ├── register/
│   │   └── page.tsx                  # Registration page (public)
│   │
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/
│       │   │   └── route.ts          # NextAuth.js route handler
│       │   └── register/
│       │       └── route.ts          # POST /api/auth/register (create owner account)
│       ├── rooms/
│       │   ├── route.ts              # GET /api/rooms (with active_tenant), POST /api/rooms
│       │   └── [id]/
│       │       ├── route.ts          # PUT /api/rooms/[id], DELETE /api/rooms/[id]
│       │       ├── last-meter/
│       │       │   └── route.ts      # GET /api/rooms/[id]/last-meter
│       │       ├── checkin/
│       │       │   └── route.ts      # POST /api/rooms/[id]/checkin
│       │       ├── checkout/
│       │       │   └── route.ts      # POST /api/rooms/[id]/checkout
│       │       └── tenants/
│       │           └── route.ts      # GET /api/rooms/[id]/tenants (history)
│       ├── bills/
│       │   ├── route.ts              # GET /api/bills, POST /api/bills (upsert)
│       │   └── [id]/
│       │       └── route.ts          # PATCH /api/bills/[id], DELETE /api/bills/[id]
│       └── admin/
│           ├── setup/
│           │   └── route.ts          # POST /api/admin/setup (one-time superadmin creation)
│           └── owners/
│               ├── route.ts          # GET /api/admin/owners, POST /api/admin/owners
│               └── [id]/
│                   └── route.ts      # PATCH /api/admin/owners/[id], DELETE /api/admin/owners/[id]
│
├── components/
│   ├── Navbar.tsx                    # Top nav (Client Component) — shows user info + logout
│   ├── Providers.tsx                 # SessionProvider wrapper for NextAuth
│   └── ui/                          # shadcn/ui primitives
│       ├── badge.tsx, button.tsx, card.tsx, dialog.tsx
│       ├── input.tsx, label.tsx, select.tsx, separator.tsx
│       ├── sonner.tsx, table.tsx, textarea.tsx, accordion.tsx
│
├── lib/
│   ├── db.ts                         # All database query + admin functions
│   ├── helpers.ts                    # Pure business logic utilities
│   ├── types.ts                      # Shared TypeScript interfaces
│   └── utils.ts                      # Tailwind class merger (cn)
│
├── types/
│   └── next-auth.d.ts                # Module augmentation: adds id + role to Session/JWT
│
├── scripts/
│   ├── migrate.sql                   # PostgreSQL migration script (run manually in DB console)
│   └── seed.ts                       # Database seeding script (npm run seed)
│
├── auth.ts                           # NextAuth v5 config (Credentials provider, JWT callbacks)
├── middleware.ts                     # Route protection + role-based access control
├── components.json                   # shadcn/ui configuration
├── next.config.ts                    # Next.js configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json                      # NPM manifest and scripts
```

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐ ┌───────┐  │
│  │Dashboard │  │  Rooms Page  │  │  Billing   │ │/admin │  │
│  │(SSR page)│  │(Client page) │  │  Pages     │ │(SA)   │  │
│  └────┬─────┘  └──────┬───────┘  └─────┬──────┘ └───┬───┘  │
└───────┼───────────────┼────────────────┼─────────────┼───────┘
        │ SSR            │ fetch()         │ fetch()     │ fetch()
        ▼               ▼                 ▼             ▼
┌──────────────────────────────────────────────────────────────┐
│             Next.js Server (Vercel Edge/Node)                 │
│                                                              │
│  middleware.ts ──→ auth check + role guard                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Route Handlers                       │   │
│  │  /api/rooms/*    /api/bills/*    /api/admin/*         │   │
│  │  /api/auth/*                                         │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │ calls                              │
│  ┌──────────────────────▼───────────────────────────────┐   │
│  │                  lib/db.ts                            │   │
│  │  (all SQL via @vercel/postgres tagged templates)      │   │
│  └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────┼────────────────────────────────────┘
                          │ SQL (connection pooling)
                          ▼
                ┌──────────────────────┐
                │   Vercel Postgres     │
                │   (PostgreSQL)        │
                │                      │
                │  users               │
                │  kosts (→ users)     │
                │  rooms (→ kosts)     │
                │  tenants (→ rooms)   │
                │  bills (→ rooms)     │
                └──────────────────────┘
```

---

## 4. Database Schema

### Table: `users`

```sql
CREATE TABLE users (
  id            VARCHAR(64)  PRIMARY KEY,
  name          VARCHAR(128) NOT NULL,
  email         VARCHAR(256) UNIQUE NOT NULL,
  password_hash VARCHAR(256) NOT NULL,
  role          VARCHAR(32)  NOT NULL DEFAULT 'owner',  -- 'owner' | 'superadmin'
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table: `kosts`

```sql
CREATE TABLE kosts (
  id         VARCHAR(64)  PRIMARY KEY,
  user_id    VARCHAR(64)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(128) NOT NULL,
  address    TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table: `rooms`

```sql
CREATE TABLE rooms (
  id            VARCHAR(64)  PRIMARY KEY,
  room_name     VARCHAR(128) NOT NULL,
  kost_id       VARCHAR(64)  NOT NULL REFERENCES kosts(id) ON DELETE CASCADE,
  base_price    INTEGER      NOT NULL,
  monthly_fee   INTEGER      NOT NULL,
  price_per_kwh INTEGER      NOT NULL,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);
-- Note: tenant_name column was removed; tenants tracked in separate table
```

### Table: `tenants`

```sql
CREATE TABLE tenants (
  id             VARCHAR(64)  PRIMARY KEY,
  room_id        VARCHAR(64)  NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name           VARCHAR(128) NOT NULL,
  phone          VARCHAR(32),
  check_in_date  DATE         NOT NULL DEFAULT CURRENT_DATE,
  check_out_date DATE,                    -- NULL = still active
  notes          TEXT,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table: `bills`

```sql
CREATE TABLE bills (
  id                   VARCHAR(64) PRIMARY KEY,
  room_id              VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  month                SMALLINT    NOT NULL CHECK (month >= 1 AND month <= 12),
  year                 SMALLINT    NOT NULL,
  meter_start          INTEGER     NOT NULL DEFAULT 0,
  meter_end            INTEGER     NOT NULL DEFAULT 0,
  kwh_used             INTEGER     NOT NULL DEFAULT 0,
  total_amount         INTEGER     NOT NULL DEFAULT 0,
  status               VARCHAR(16) NOT NULL DEFAULT 'unpaid',  -- 'paid' | 'unpaid' | 'expired'
  tenant_snapshot_name VARCHAR(128),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (room_id, month, year)
);
-- Note: is_paid boolean was replaced by status VARCHAR
```

**Key relationships:**
- `users` → `kosts` (1:1 per owner, `ON DELETE CASCADE`)
- `kosts` → `rooms` (1:N, `ON DELETE CASCADE`)
- `rooms` → `tenants` (1:N history, `ON DELETE CASCADE`)
- `rooms` → `bills` (1:N, `ON DELETE CASCADE`, `UNIQUE (room_id, month, year)`)

---

## 5. Authentication & Authorization

### NextAuth.js v5 (Credentials Provider)

- **Config**: `auth.ts` — email/bcrypt verify, JWT strategy, role injected into token
- **Session fields**: `id`, `name`, `email`, `role`
- **Type extension**: `types/next-auth.d.ts`

### Middleware (`middleware.ts`)

| Path | Rule |
|---|---|
| `/login`, `/register`, `/api/auth/*`, `/api/admin/setup` | Public (no auth required) |
| `/admin/*`, `/api/admin/*` (except setup) | Requires `role === 'superadmin'` |
| All other routes | Requires any authenticated session |
| After login: `superadmin` | Redirect to `/admin` |
| After login: `owner` | Redirect to `/` |

---

## 6. Key Files Reference

### `lib/types.ts` — Core Interfaces

```typescript
type UserRole = "superadmin" | "owner";
type BillStatus = "paid" | "unpaid" | "expired";

interface User { id, name, email, password_hash, role: UserRole, created_at? }
interface Kost { id, user_id, name, address?, created_at? }
interface Room { id, room_name, kost_id, base_price, monthly_fee, price_per_kwh }
interface Tenant { id, room_id, name, phone?, check_in_date, check_out_date?, notes? }
interface Bill { id, room_id, month, year, meter_start, meter_end, kwh_used, total_amount, status: BillStatus, tenant_snapshot_name? }
interface RoomWithTenant extends Room { active_tenant?: Tenant | null }
interface OwnerWithKost extends User { kost_id, kost_name, kost_address, room_count }
```

### `lib/db.ts` — Database Functions

**Users & Auth:**
| Function | Description |
|---|---|
| `getUserByEmail(email)` | Fetch user by email (includes role) |
| `createUser(user)` | Insert new user (with role) |

**Kosts:**
| Function | Description |
|---|---|
| `getKostByUserId(userId)` | Get kost for an owner |
| `createKost(kost)` | Create a new kost |

**Rooms:**
| Function | Description |
|---|---|
| `getRooms(kostId)` | List rooms for a kost |
| `getRoomById(id)` | Get single room |
| `createRoom(data)` | Create room |
| `updateRoom(id, data)` | Update room |
| `deleteRoom(id)` | Delete room (cascade) |

**Tenants:**
| Function | Description |
|---|---|
| `getActiveTenant(roomId)` | Get current tenant (check_out_date IS NULL) |
| `getTenantHistory(roomId)` | All tenants for a room |
| `checkinTenant(roomId, name, phone, checkInDate)` | Create tenant record |
| `checkoutTenant(tenantId, roomId, notes, checkOutDate?)` | Set departure + expire unpaid bills |

**Bills:**
| Function | Description |
|---|---|
| `getBills(kostId, filters?)` | List bills scoped by kost, with room join |
| `getPrevMonthMeterEnd(roomId, month, year)` | Fetch last meter_end for auto-fill |
| `upsertBill(bill)` | INSERT ... ON CONFLICT DO UPDATE |
| `updateBillStatus(id, status)` | Toggle paid/unpaid (blocked for expired) |
| `deleteBill(id)` | Delete a bill |

**Admin:**
| Function | Description |
|---|---|
| `getAllOwners()` | List all owners with kost info and room count |
| `hasSuperAdmin()` | Check if any superadmin exists |
| `createOwnerUser(...)` | Create owner + kost in one call |
| `updateOwnerUser(userId, data)` | Update owner + kost fields |
| `deleteOwnerUser(userId)` | Delete owner + all data (cascade) |

### `lib/helpers.ts` — Business Logic

| Function | Purpose |
|---|---|
| `calculateBillAmount(room, meterStart, meterEnd)` | Returns `{ kwh_used, total_amount }` |
| `formatRupiah(amount)` | Formats as `Rp 1.500.000` |
| `formatNumber(n)` | Dot-separated thousands |
| `generateBillId(roomId, month, year)` | Deterministic `bill-{MM}{YYYY}-room{N}` |
| `generateBillText(bill, room)` | Full Indonesian billing message |
| `MONTH_NAMES` | Array of Indonesian month names |

---

## 7. API Routes Reference

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create owner account + kost |
| `POST` | `/api/admin/setup` | Public (one-time) | Create first superadmin |
| `*` | `/api/auth/[...nextauth]` | Public | NextAuth handlers |

### Rooms (owner-scoped)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/rooms` | Owner | List rooms with `active_tenant` |
| `POST` | `/api/rooms` | Owner | Create room (+ optional initial tenant) |
| `PUT` | `/api/rooms/[id]` | Owner | Update room |
| `DELETE` | `/api/rooms/[id]` | Owner | Delete room + cascade |
| `GET` | `/api/rooms/[id]/last-meter` | Owner | Previous month meter_end |
| `POST` | `/api/rooms/[id]/checkin` | Owner | Check in new tenant |
| `POST` | `/api/rooms/[id]/checkout` | Owner | Check out tenant + expire bills |
| `GET` | `/api/rooms/[id]/tenants` | Owner | Tenant history for room |

### Bills (owner-scoped)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/bills` | Owner | List bills (`?month=N&year=N`) |
| `POST` | `/api/bills` | Owner | Upsert bills + snapshot tenant name |
| `PATCH` | `/api/bills/[id]` | Owner | Toggle paid/unpaid (not expired) |
| `DELETE` | `/api/bills/[id]` | Owner | Delete bill |

### Admin (superadmin-only)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/owners` | SuperAdmin | List all owners with kost info |
| `POST` | `/api/admin/owners` | SuperAdmin | Create owner + kost |
| `PATCH` | `/api/admin/owners/[id]` | SuperAdmin | Update owner + kost |
| `DELETE` | `/api/admin/owners/[id]` | SuperAdmin | Delete owner + all data |

---

## 8. Rendering Strategy

| Page | Type | Strategy |
|---|---|---|
| `/(owner)/` (Dashboard) | Server Component | `force-dynamic` SSR |
| `/(owner)/rooms` | Client Component | fetch on mount |
| `/(owner)/billing` | Client Component | fetch on mount + per-action |
| `/(owner)/billing-list` | Client Component | fetch on filter change |
| `/admin` | Client Component | fetch on mount |
| `/login`, `/register` | Client Component | form-based |

---

## 9. Styling System

- **Tailwind CSS v4** with CSS custom properties.
- **shadcn/ui** components — `neutral` base, `new-york` style variant.
- **Path alias**: `@/` maps to project root.
- `cn()` helper in `lib/utils.ts` for conditional class merging.

---

## 10. Environment & Deployment

### Required Environment Variables

| Variable | Description |
|---|---|
| `POSTGRES_URL` | Vercel Postgres connection string (pooled) |
| `AUTH_SECRET` | NextAuth.js secret (random 32+ char string) |
| `NEXTAUTH_URL` | Base URL of the app (e.g., `http://localhost:3000`) |

Additional Vercel Postgres variables auto-injected when DB is linked:
`POSTGRES_URL_NON_POOLING`, `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`

### Local Development

```bash
npm install
# Set up .env.local with POSTGRES_URL, AUTH_SECRET, NEXTAUTH_URL

# Run migration in Vercel Postgres Query Editor (scripts/migrate.sql)
# Create first superadmin:
# curl -X POST http://localhost:3000/api/admin/setup \
#   -H "Content-Type: application/json" \
#   -d '{"name":"Admin","email":"admin@kost.com","password":"secret123"}'

npm run dev     # http://localhost:3000
```

### NPM Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev` | Development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve production build |
| `lint` | `next lint` | Run ESLint |
| `seed` | `tsx scripts/seed.ts` | Seed database |

### Node.js Requirement

Next.js 16 requires **Node.js ≥ 20.9.0**. Use `nvm use 20` if on a lower version.
