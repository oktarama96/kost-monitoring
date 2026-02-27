# KostManager — Business & Functional Specifications

## 1. Project Overview

**KostManager** is a **multi-tenant SaaS** web application for managing Indonesian boarding houses (*kost*). Each account represents one property (kost) manager. A **SuperAdmin** oversees all accounts.

Core capabilities per kost manager:
- Register and manage rooms
- Track tenant occupancy history (check-in / check-out)
- Record monthly electricity meter readings per room
- Auto-calculate monthly bills based on configurable room rates
- Track payment status per bill
- Generate copy-paste billing messages (e.g., for WhatsApp)

The system now requires **authentication** — all manager pages are protected by JWT sessions (NextAuth.js v5). Data is isolated per kost via `kost_id`.

---

## 2. Domain Glossary

| Term | Meaning |
|---|---|
| **Kost** | An Indonesian boarding house / room rental property |
| **Kamar** | Indonesian for "room" |
| **Penghuni** / **Tenant** | A person renting a room |
| **Kosong** | Vacant (no active tenant) |
| **Tagihan** | Bill / invoice |
| **Lunas / Belum Lunas** | Paid / Unpaid |
| **Kedaluwarsa / Expired** | Bill that was unpaid when the tenant checked out |
| **kWh** | Kilowatt-hour; unit of electricity consumption |
| **Meter Start** | Electricity meter reading at start of billing period |
| **Meter End** | Electricity meter reading at end of billing period |
| **Base Price** | Fixed monthly rental fee (IDR) |
| **Monthly Fee** | Fixed monthly utility/service charge (IDR) |
| **Price per kWh** | Electricity rate charged to tenant (IDR per kWh) |
| **Total Amount** | `base_price + monthly_fee + (kwh_used × price_per_kwh)` |
| **Owner** | A kost manager with their own account and data |
| **SuperAdmin** | Platform-level administrator who manages all owner accounts |

---

## 3. Core Business Rules

### 3.1 Bill Calculation

```
kWh Used     = meter_end − meter_start
Electricity  = kWh Used × price_per_kwh
Total Amount = base_price + monthly_fee + Electricity
```

All monetary values are in **IDR**, stored as integers (no decimals).

### 3.2 Bill Status

Bills have three possible statuses (`status` field — replaces the old `is_paid` boolean):

| Status | Meaning |
|---|---|
| `unpaid` | Bill exists but has not been paid |
| `paid` | Bill has been marked as paid |
| `expired` | Bill was unpaid when the tenant checked out; no longer actionable |

- `paid` bills are read-only in the billing input form.
- `expired` bills show a grey "Kedaluwarsa" badge and cannot be toggled.
- Only `paid` ↔ `unpaid` toggling is allowed via the billing list.

### 3.3 One Bill Per Room Per Month

- `UNIQUE (room_id, month, year)` constraint — one bill per room per calendar month.
- Saving a bill for an existing period performs an **upsert**.

### 3.4 Meter Start Auto-Population

- On billing input, the previous month's `meter_end` is fetched and pre-filled as `meter_start`.
- If none exists, the user must manually enter it (field highlighted in amber).

### 3.5 Deterministic Bill IDs

- Bill IDs: `bill-{MM}{YYYY}-room{N}` (e.g., `bill-022026-room01`).
- Enables upsert via `ON CONFLICT (id) DO UPDATE`.

### 3.6 Tenant Snapshot on Bill Creation

- When a bill is created, the **active tenant's name** is captured in `tenant_snapshot_name`.
- This preserves the billing record even after the tenant has checked out.

### 3.7 Tenant Lifecycle

- **Check-in**: Creates a new record in the `tenants` table with `check_in_date` and `check_out_date = NULL`.
- **Check-out**: Sets `check_out_date` on the active tenant record AND sets all `unpaid` bills for that room to `expired`.
- A room can have at most one **active** tenant (where `check_out_date IS NULL`).
- When adding a new room, an optional initial tenant can be specified.

### 3.8 Cascade Deletion

- Deleting a room deletes all its bills, tenants (via FK `ON DELETE CASCADE`).
- Deleting an owner account (by SuperAdmin) deletes their kost, all rooms, tenants, and bills.

### 3.9 Data Isolation (Multi-Tenancy)

- All room and bill queries are scoped by `kost_id` derived from the authenticated user's session.
- Owners cannot access or modify data belonging to other owners.

---

## 4. User Roles

| Role | Access |
|---|---|
| `owner` | Full access to their own kost data (rooms, tenants, bills). Cannot access `/admin`. |
| `superadmin` | Access only to `/admin` panel. Can CRUD owner accounts. Has no kost data of their own. |

---

## 5. Feature Specifications

### 5.1 Authentication

- **Login** (`/login`): Email + password. Uses NextAuth.js v5 Credentials provider with bcrypt verification.
- **Register** (`/register`): Creates a new owner account + a default kost in one step.
- **Session**: JWT strategy. `role` and `id` are embedded in the token.
- **Middleware**: All routes are protected. Unauthenticated requests redirect to `/login`. Superadmin redirects to `/admin` after login. Non-superadmin cannot access `/admin`.
- **SuperAdmin Setup** (`POST /api/admin/setup`): Public one-time endpoint to create the first superadmin. Returns 409 if one already exists.

### 5.2 Dashboard (`/`)

- Scoped to the authenticated owner's kost.
- Shows current month's billing summary: total billed, paid, unpaid.
- Alerts for unpaid bills and rooms not yet billed.
- Shows expired bills section.
- Displays tenant name from `tenant_snapshot_name` (not from rooms table).
- Server-rendered (`force-dynamic`).

### 5.3 Room Management (`/rooms`)

- CRUD for rooms within the owner's kost.
- Each room card shows:
  - Room name, pricing details
  - **Active tenant info** (name, phone, check-in date) if occupied
  - Occupancy badge: "Dihuni" / "Kosong"
  - Actions: Edit room details, Check-out tenant, Check-in new tenant, Delete room
- **Tenant history accordion**: Expandable list of all past tenants for a room.
- **Add Room dialog**: Optional initial tenant section (name, phone, check-in date).
- **Checkout dialog**: Input for departure date (default today) + optional notes. Expires unpaid bills automatically.
- **Check-in dialog**: Name, phone, check-in date (default today).

### 5.4 Billing Input (`/billing`)

- Enter electricity meter readings per room for a selected month/year.
- Per-room entry: meter start (auto-filled), meter end, live kWh + amount preview.
- Displays `tenant_snapshot_name` (active tenant name at billing time).
- `paid` bills are read-only. `expired` bills cannot be re-billed.

### 5.5 Billing List (`/billing-list`)

- Filter by month/year. Shows summary strip: total, paid, unpaid amounts.
- Status badges: Lunas (green), Belum Lunas (red), Kedaluwarsa (grey/disabled).
- Toggle `paid` ↔ `unpaid` (disabled for `expired`).
- Generate WhatsApp-ready billing message per bill.
- Delete bill (with confirmation).

### 5.6 SuperAdmin Panel (`/admin`)

- Separate layout from owner pages (independent of root layout).
- Theme matches owner pages (white/slate/violet).
- **Owner table**: Lists all owner accounts with kost name, address, room count, registration date.
- **Add owner**: Creates account + kost in one form (name, email, password, kost name, address).
- **Edit owner**: Update name, email, password (optional), kost name, address.
- **Delete owner**: Permanently deletes account + all associated data (cascade).
- Stats cards: total owners, total rooms across all kosts.

---

## 6. Bill Text Generation

Generated billing message format (Bahasa Indonesia):

```
Tagihan Listrik - [Room Name]
Periode: [Month Name] [Year]
Tenant: [Tenant Snapshot Name]

Rincian:
- Harga Kamar   : Rp [base_price]
- Biaya Bulanan : Rp [monthly_fee]
- Listrik       : [meter_start] → [meter_end] ([kwh_used] kWh × Rp [price_per_kwh]) = Rp [electricity_cost]

Total           : Rp [total_amount]

Pembayaran ke:
[Owner Name]
[Bank Name]
[Account Number]
```

**Hardcoded Payment Details** (current implementation):
- Account Holder: `I KOMANG OKTARAMA BA`
- Bank: `Bank Mandiri`
- Account Number: `1450013849266`

---

## 7. Navigation

### Owner Navigation (Navbar)

| Label | Route | Description |
|---|---|---|
| Dashboard | `/` | Monthly summary and billing status |
| Kelola Kamar | `/rooms` | Room + tenant management |
| Input Tagihan | `/billing` | Monthly meter reading input |
| Daftar Tagihan | `/billing-list` | Billing history and management |

The navbar shows the logged-in user's name, avatar initials, and a logout dropdown.

### SuperAdmin Navigation

A separate header at `/admin` (no Navbar). Shows "KostManager Admin" badge, user name, and logout.

---

## 8. Localization & Formatting

- **Language**: Bahasa Indonesia (all UI labels, messages, alerts)
- **Currency**: IDR — formatted with dot-separated thousands (e.g., `Rp 1.500.000`)
- **Month Names**: Indonesian (Januari … Desember)
- **HTML `lang`**: `"id"` in root layout

---

## 9. Error Handling

- API errors return `{ error: string }` with appropriate HTTP status.
- UI communicates errors via **Sonner** toast notifications.
- Client-side form validation (inline).
- `expired` bills return 403 if toggled via API.

---

## 10. Known Constraints & Limitations

1. **Single kost per owner**: Each owner account manages exactly one kost.
2. **No automated tests**: No unit, integration, or E2E tests.
3. **No audit trail**: Edits and deletions are permanent.
4. **Hardcoded bank details**: Payment info is embedded in `lib/helpers.ts`.
5. **Single currency**: IDR only.
6. **No automatic notifications**: System generates bill text but does not send messages.
7. **Year range**: Billing input year dropdown shows only ±1 year from current.
8. **Node.js ≥ 20.9** required (Next.js 16 requirement).
