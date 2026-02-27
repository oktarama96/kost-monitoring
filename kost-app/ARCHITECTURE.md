# KostManager — Architecture Overview

## 1. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| Runtime | React | 19 |
| Language | TypeScript | 5.9.3 |
| Styling | Tailwind CSS v4 | latest |
| UI Components | shadcn/ui (New York style) + Radix UI | latest |
| Icons | Lucide React | latest |
| Forms | React Hook Form + Zod | latest |
| Toast Notifications | Sonner | latest |
| Database | PostgreSQL via Vercel Postgres (`@vercel/postgres`) | latest |
| Theme | next-themes (light/dark via CSS variables) | latest |
| Fonts | Geist Sans, Geist Mono (Next.js font optimization) | latest |
| Deployment | Vercel | — |

---

## 2. Project Directory Structure

```
kost-app/
├── app/                          # Next.js App Router root
│   ├── layout.tsx                # Root layout: HTML shell, fonts, Navbar, Toaster
│   ├── page.tsx                  # Dashboard page (Server Component, force-dynamic)
│   ├── globals.css               # Tailwind imports + CSS custom property design tokens
│   ├── favicon.ico
│   ├── rooms/
│   │   └── page.tsx              # Room management (Client Component)
│   ├── billing/
│   │   └── page.tsx              # Monthly billing input (Client Component)
│   ├── billing-list/
│   │   └── page.tsx              # Billing history & management (Client Component)
│   └── api/
│       ├── rooms/
│       │   ├── route.ts          # GET /api/rooms, POST /api/rooms
│       │   └── [id]/
│       │       ├── route.ts      # PUT /api/rooms/[id], DELETE /api/rooms/[id]
│       │       └── last-meter/
│       │           └── route.ts  # GET /api/rooms/[id]/last-meter
│       └── bills/
│           ├── route.ts          # GET /api/bills, POST /api/bills
│           └── [id]/
│               └── route.ts      # PATCH /api/bills/[id], DELETE /api/bills/[id]
│
├── components/
│   ├── Navbar.tsx                # Top navigation bar (Client Component)
│   └── ui/                       # shadcn/ui primitives
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── form.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       ├── sonner.tsx            # Toaster wrapper
│       ├── table.tsx
│       └── textarea.tsx
│
├── lib/
│   ├── db.ts                     # All database query functions (SQL via @vercel/postgres)
│   ├── helpers.ts                # Pure business logic utilities
│   ├── types.ts                  # Shared TypeScript interfaces
│   └── utils.ts                  # Tailwind class merger (cn)
│
├── data/
│   └── data.json                 # Static seed/reference data (dev only)
│
├── scripts/
│   ├── schema.sql                # PostgreSQL DDL (manual execution)
│   └── seed.ts                   # Database seeding script (npm run seed)
│
├── public/                       # Static assets
├── components.json               # shadcn/ui configuration
├── next.config.ts                # Next.js configuration (minimal)
├── tsconfig.json                 # TypeScript configuration
├── eslint.config.mjs             # ESLint configuration
├── postcss.config.mjs            # PostCSS configuration
└── package.json                  # NPM manifest and scripts
```

---

## 3. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│                                                             │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │Dashboard │  │  Room Mgmt   │  │ Billing Input / List  │ │
│  │(SSR page)│  │(Client page) │  │    (Client pages)     │ │
│  └────┬─────┘  └──────┬───────┘  └──────────┬────────────┘ │
└───────┼───────────────┼────────────────────┼───────────────┘
        │ Server Render  │ fetch()             │ fetch()
        ▼               ▼                     ▼
┌───────────────────────────────────────────────────────────────┐
│                    Next.js Server (Vercel)                     │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                  API Route Handlers                     │  │
│  │  GET/POST /api/rooms                                   │  │
│  │  PUT/DELETE /api/rooms/[id]                            │  │
│  │  GET /api/rooms/[id]/last-meter                        │  │
│  │  GET/POST /api/bills                                   │  │
│  │  PATCH/DELETE /api/bills/[id]                          │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                       │
│  ┌────────────────────▼───────────────────────────────────┐  │
│  │                  lib/db.ts                              │  │
│  │  (SQL query functions via @vercel/postgres)             │  │
│  └────────────────────┬───────────────────────────────────┘  │
└───────────────────────┼───────────────────────────────────────┘
                        │ SQL (connection pooling)
                        ▼
              ┌──────────────────────┐
              │   Vercel Postgres    │
              │    (PostgreSQL)      │
              │                     │
              │  ┌────────────────┐  │
              │  │    rooms       │  │
              │  └───────┬────────┘  │
              │          │ FK        │
              │  ┌───────▼────────┐  │
              │  │    bills       │  │
              │  └────────────────┘  │
              └──────────────────────┘
```

---

## 4. Data Flow

### 4.1 Dashboard (Server-Side Rendering)

```
Request → app/page.tsx (Server Component)
  → lib/db.ts: getBillsWithRooms(month, year)
  → SQL JOIN: bills LEFT JOIN rooms
  → Returns page HTML with embedded data
```

### 4.2 Client Pages (Client-Side Data Fetching)

```
Page Load → Client Component mounts
  → useEffect: fetch('/api/rooms') or fetch('/api/bills?month=N&year=N')
  → API Route Handler
  → lib/db.ts query function
  → PostgreSQL
  → JSON response → React state → UI render
```

### 4.3 Billing Upsert Flow

```
User enters meter_end → live preview computes kWh + total
User clicks Save
  → POST /api/bills { month, year, entries: [{ room_id, meter_end }] }
  → API: generateBillId(room_id, month, year)
  → API: calculateBillAmount(room, meter_start, meter_end)
  → SQL: INSERT ... ON CONFLICT (id) DO UPDATE
  → Response: { message, created: [], updated: [] }
  → Toast notification
```

### 4.4 Payment Toggle Flow

```
User clicks status badge in Billing List
  → PATCH /api/bills/[id] { is_paid: !current }
  → SQL: UPDATE bills SET is_paid = $1 WHERE id = $2
  → JSON: updated Bill object
  → Local React state update (no full re-fetch)
```

---

## 5. Key Files Reference

### `lib/types.ts` — Core Interfaces

```typescript
interface Room {
  id: string;           // "room-{timestamp}" or "room-01"
  room_name: string;
  tenant_name: string;  // "Kosong" = vacant
  base_price: number;   // IDR
  monthly_fee: number;  // IDR
  price_per_kwh: number; // IDR per kWh
  created_at: string;
}

interface Bill {
  id: string;           // "bill-{MM}{YYYY}-room{N}"
  room_id: string;
  month: number;        // 1–12
  year: number;
  meter_start: number;
  meter_end: number;
  kwh_used: number;     // Computed: meter_end - meter_start
  total_amount: number; // Computed: base_price + monthly_fee + (kwh_used * price_per_kwh)
  is_paid: boolean;
  created_at: string;
}

interface BillWithRoom extends Bill {
  room: Room;
}
```

### `lib/helpers.ts` — Business Logic

| Function | Purpose |
|---|---|
| `calculateBillAmount(room, meterStart, meterEnd)` | Returns `{ kwh_used, total_amount }` |
| `formatRupiah(amount)` | Formats integer as `Rp 1.500.000` |
| `formatNumber(n)` | Formats integer with dot thousands separator |
| `generateBillId(roomId, month, year)` | Returns deterministic `bill-{MM}{YYYY}-room{N}` |
| `generateBillText(bill, room)` | Returns full Indonesian billing message string |
| `MONTH_NAMES` | Array of Indonesian month names (index 0 = "Januari") |

### `lib/db.ts` — Database Functions

| Function | SQL Operation |
|---|---|
| `getRooms()` | `SELECT * FROM rooms ORDER BY room_name` |
| `getRoomById(id)` | `SELECT * FROM rooms WHERE id = $1` |
| `createRoom(data)` | `INSERT INTO rooms ...` |
| `updateRoom(id, data)` | `UPDATE rooms SET ... WHERE id = $1` |
| `deleteRoom(id)` | `DELETE FROM rooms WHERE id = $1` |
| `getLastMeterReading(roomId, month, year)` | `SELECT meter_end FROM bills WHERE room_id = $1 AND month = $2 AND year = $3` (previous month) |
| `getBills(month?, year?)` | `SELECT * FROM bills [WHERE ...]` |
| `getBillsWithRooms(month, year)` | `SELECT ... FROM bills JOIN rooms ON ...` |
| `upsertBill(data)` | `INSERT INTO bills ... ON CONFLICT (id) DO UPDATE` |
| `updateBillPayment(id, isPaid)` | `UPDATE bills SET is_paid = $1 WHERE id = $2` |
| `deleteBill(id)` | `DELETE FROM bills WHERE id = $1` |

---

## 6. Database Schema

### Table: `rooms`

```sql
CREATE TABLE rooms (
  id            VARCHAR(64)   PRIMARY KEY,
  room_name     VARCHAR(128)  NOT NULL,
  tenant_name   VARCHAR(128)  NOT NULL,
  base_price    INTEGER       NOT NULL,
  monthly_fee   INTEGER       NOT NULL,
  price_per_kwh INTEGER       NOT NULL,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);
```

### Table: `bills`

```sql
CREATE TABLE bills (
  id            VARCHAR(64)   PRIMARY KEY,
  room_id       VARCHAR(64)   NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  month         SMALLINT      NOT NULL CHECK (month >= 1 AND month <= 12),
  year          SMALLINT      NOT NULL,
  meter_start   INTEGER       NOT NULL DEFAULT 0,
  meter_end     INTEGER       NOT NULL DEFAULT 0,
  kwh_used      INTEGER       NOT NULL DEFAULT 0,
  total_amount  INTEGER       NOT NULL DEFAULT 0,
  is_paid       BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (room_id, month, year)
);
```

**Key constraints:**
- `UNIQUE (room_id, month, year)` — one bill per room per month (enables upsert)
- `ON DELETE CASCADE` — deleting a room removes all its bills

---

## 7. API Routes Reference

### Rooms

| Method | Path | Handler | Description |
|---|---|---|---|
| `GET` | `/api/rooms` | `app/api/rooms/route.ts` | List all rooms |
| `POST` | `/api/rooms` | `app/api/rooms/route.ts` | Create a room |
| `PUT` | `/api/rooms/[id]` | `app/api/rooms/[id]/route.ts` | Update a room |
| `DELETE` | `/api/rooms/[id]` | `app/api/rooms/[id]/route.ts` | Delete a room (cascade) |
| `GET` | `/api/rooms/[id]/last-meter` | `app/api/rooms/[id]/last-meter/route.ts` | Get previous month's meter_end |

**Query params for last-meter**: `?month=N&year=N` (current period; API computes the previous month)

### Bills

| Method | Path | Handler | Description |
|---|---|---|---|
| `GET` | `/api/bills` | `app/api/bills/route.ts` | List bills, optional `?month=N&year=N` filter |
| `POST` | `/api/bills` | `app/api/bills/route.ts` | Upsert bills for a period |
| `PATCH` | `/api/bills/[id]` | `app/api/bills/[id]/route.ts` | Toggle payment status |
| `DELETE` | `/api/bills/[id]` | `app/api/bills/[id]/route.ts` | Delete a bill |

**POST `/api/bills` request body:**
```json
{
  "month": 2,
  "year": 2026,
  "entries": [
    { "room_id": "room-01", "meter_end": 1500 },
    { "room_id": "room-02", "meter_end": 800, "meter_start_override": 750 }
  ]
}
```

---

## 8. Rendering Strategy

| Page | Type | Strategy | Rationale |
|---|---|---|---|
| `/` (Dashboard) | Server Component | `force-dynamic` SSR | Real-time data, no stale cache |
| `/rooms` | Client Component | Client-side fetch on mount | Interactive CRUD with dialogs |
| `/billing` | Client Component | Client-side fetch on mount + per-action | Per-room independent save |
| `/billing-list` | Client Component | Client-side fetch on filter change | Dynamic filtering |

---

## 9. Styling System

- **Tailwind CSS v4** with CSS custom properties for theming.
- **Design tokens** defined in `app/globals.css` using `oklch` color space.
- **Dark mode** support via the `.dark` class on `<html>` (managed by `next-themes`).
- **shadcn/ui** components use the `neutral` base color and `new-york` style variant.
- **Path alias**: `@/` maps to the project root (e.g., `@/lib/db`, `@/components/ui/button`).

---

## 10. Environment & Deployment

### Required Environment Variables

| Variable | Description |
|---|---|
| `POSTGRES_URL` | Vercel Postgres connection string (pooled) |

Additional variables automatically injected by Vercel when a Postgres database is linked:
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`

### Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up .env.local with POSTGRES_URL

# 3. Initialize database
npm run seed        # Creates tables + inserts sample data

# 4. Start dev server
npm run dev         # http://localhost:3000
```

### Production Build & Deploy

```bash
npm run build       # Produces optimized .next/ build
npm run start       # Serve production build locally
# Push to Vercel via git for automatic deployment
```

### NPM Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev` | Start development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Serve production build |
| `lint` | `next lint` | Run ESLint |
| `seed` | `tsx scripts/seed.ts` | Seed the database |
