# KostManager — Business & Functional Specifications

## 1. Project Overview

**KostManager** is an internal web application for managing a boarding house (*kost*) in Indonesia. It enables the property owner/manager to:

- Maintain a registry of rooms and their tenants
- Record monthly electricity meter readings per room
- Automatically calculate monthly bills based on configurable room rates and electricity pricing
- Track payment status for each bill
- Generate copy-paste-ready billing messages to send to tenants (e.g., via WhatsApp)

The system is **single-tenant**, **unauthenticated**, and intended for **internal use only** by the property owner.

---

## 2. Domain Glossary

| Term | Meaning |
|---|---|
| **Kost** | Indonesian term for a boarding house / room rental |
| **Kamar** | Indonesian for "room" |
| **Kosong** | Indonesian for "empty/vacant"; used as a sentinel tenant name for unoccupied rooms |
| **Tagihan** | Indonesian for "bill/invoice" |
| **Bayar / Belum Bayar** | Indonesian for "paid / not yet paid" |
| **kWh** | Kilowatt-hour; unit of electricity consumption |
| **Meter Start** | Electricity meter reading at the beginning of the billing period |
| **Meter End** | Electricity meter reading at the end of the billing period |
| **Base Price** | Fixed monthly room rental fee (IDR) |
| **Monthly Fee** | Fixed monthly utility/service charge added on top of base price (IDR) |
| **Price per kWh** | Variable electricity rate charged to the tenant (IDR per kWh) |
| **Total Amount** | The final computed bill amount: `base_price + monthly_fee + (kwh_used × price_per_kwh)` |

---

## 3. Core Business Rules

### 3.1 Bill Calculation

```
kWh Used     = meter_end − meter_start
Electricity  = kWh Used × price_per_kwh
Total Amount = base_price + monthly_fee + Electricity
```

All monetary values are in **Indonesian Rupiah (IDR)**, stored as integers (no decimals).

### 3.2 Room Vacancy

- A room with `tenant_name = "Kosong"` is considered **vacant**.
- Vacant rooms are excluded from the "Not Yet Billed" alert on the dashboard.
- Vacant rooms can still have bills created against them (the system does not block it), but the default UI workflow targets only occupied rooms.

### 3.3 One Bill Per Room Per Month

- Each room can have **at most one bill per calendar month/year** (enforced by a database `UNIQUE` constraint on `(room_id, month, year)`).
- Saving a billing entry for an existing `(room_id, month, year)` combination performs an **upsert** (update in place), not a duplicate insert.
- Bills that are **already paid** (`is_paid = true`) are **locked** in the billing input form — they are shown as read-only to prevent accidental overwriting of paid bills.

### 3.4 Meter Start Auto-Population

- When entering a new bill for a given month/year, the system automatically looks up the **previous month's `meter_end`** for that room and pre-fills it as `meter_start`.
- If no prior bill exists (e.g., the room is new or no previous billing period was recorded), the user is prompted to manually enter the `meter_start` value. This input is visually highlighted (amber) to draw attention.

### 3.5 Deterministic Bill IDs

- Bill IDs are generated deterministically using the format: `bill-{MM}{YYYY}-room{N}` (e.g., `bill-022026-room01`).
- This deterministic ID is what enables the upsert: attempting to insert a bill with an existing ID triggers an `ON CONFLICT ... DO UPDATE` in the database.

### 3.6 Payment Status

- All new and updated bills have `is_paid = false` by default.
- Payment status can only be toggled from the **Billing List** page, not from the Billing Input page.
- Payment toggling is a single-click action with no confirmation dialog (immediate optimistic-style action).

### 3.7 Cascade Deletion

- Deleting a room **permanently deletes all bills** associated with that room (foreign key `ON DELETE CASCADE`).

---

## 4. Feature Specifications

### 4.1 Dashboard (`/`)

**Purpose**: Give the owner an at-a-glance summary of the current month's billing status.

**Data Scope**: Automatically filtered to the **current calendar month and year**.

**Summary Cards** (4 metrics displayed prominently):

| Card | Value |
|---|---|
| Total Billed | Sum of `total_amount` for all bills in the current month |
| Amount Paid | Sum of `total_amount` where `is_paid = true` |
| Amount Unpaid | Sum of `total_amount` where `is_paid = false` |
| Total Rooms | Count of all rooms in the system |

**Alert Panels**:

1. **Belum Bayar (Unpaid Bills)**: Lists rooms that have a bill this month but `is_paid = false`. Shows tenant name, room name, and amount owed.
2. **Belum Ada Tagihan (Not Yet Billed)**: Lists occupied rooms (tenant ≠ "Kosong") that do **not** have a bill for the current month. Provides a direct link to the Billing Input page for quick action.

**Monthly Bill Table**: Full table of all bills for the current month, showing room, tenant, period, meter readings, kWh used, electricity cost, total amount, and payment status badge.

**Rendering**: The dashboard is a **server-rendered** page (using `force-dynamic`) so that data is always fresh on each request with no client-side fetching.

---

### 4.2 Room Management (`/rooms`)

**Purpose**: Maintain the master registry of rooms and tenant information.

**Room Card Display** (per room):
- Room name
- Tenant name (or "Kosong" badge if vacant)
- Occupancy status badge: "Dihuni" (Occupied) / "Kosong" (Vacant)
- Base price (formatted as Rupiah)
- Monthly fee (formatted as Rupiah)
- Price per kWh (formatted as Rupiah)
- Edit and Delete action buttons

**Add Room** (modal dialog):

| Field | Type | Required | Validation |
|---|---|---|---|
| Room Name | Text | Yes | Non-empty string |
| Tenant Name | Text | Yes | Non-empty string; use "Kosong" for vacant |
| Base Price | Number | Yes | Non-negative integer (IDR) |
| Monthly Fee | Number | Yes | Non-negative integer (IDR) |
| Price per kWh | Number | Yes | Non-negative integer (IDR per kWh) |

**Edit Room** (same modal, pre-populated):
- All fields are editable.
- Changes are saved via `PUT /api/rooms/[id]`.

**Delete Room** (confirmation dialog):
- Warning that all associated billing data will also be deleted (cascade).
- Deletion is irreversible.
- Calls `DELETE /api/rooms/[id]`.

---

### 4.3 Billing Input (`/billing`)

**Purpose**: Enter electricity meter readings for each room to generate/update monthly bills.

**Period Selection**:
- Month dropdown: January–December (1–12)
- Year dropdown: previous year, current year, next year
- Defaults to current month and year on page load

**Per-Room Entry Form**:

| Field | Type | Editable | Notes |
|---|---|---|---|
| Meter Start | Number | Conditional | Auto-filled from previous month's `meter_end`; manually editable only if no prior bill exists (amber highlight) |
| Meter End | Number | Yes | User enters current meter reading |
| Live kWh Preview | Computed display | Read-only | Shows `meter_end − meter_start` as user types |
| Live Total Preview | Computed display | Read-only | Shows calculated total amount as user types |

**Validation** (client-side):
- `meter_end` must be ≥ `meter_start`
- Both fields must be valid non-negative integers

**Save Behavior**:
- Each room has its own independent **Save** button.
- Saving an already-existing bill for that period updates it (upsert).
- Bills with `is_paid = true` are displayed as read-only; the Save button is hidden/disabled.
- Success and error states are communicated via toast notifications.

**Upsert Flow**:
1. User selects period (month/year)
2. For each room, the app fetches previous month's meter end → pre-fills meter start
3. User enters `meter_end`
4. User clicks Save
5. API receives `{ month, year, entries: [{ room_id, meter_end, meter_start_override? }] }`
6. API computes `kwh_used` and `total_amount`, then upserts into `bills` table
7. `is_paid` is always reset to `false` on upsert

---

### 4.4 Billing List (`/billing-list`)

**Purpose**: View, filter, manage payment status, and generate bill messages for all billing records.

**Filters**:
- Month: "All Months" or specific month (1–12)
- Year: dropdown with available years

**Summary Strip** (below filters):
- Total billed amount for the current filter selection
- Total paid amount
- Total unpaid amount

**Bill Table Columns**:
| Column | Description |
|---|---|
| Room | Room name |
| Tenant | Tenant name |
| Period | Month/Year (e.g., "Februari 2026") |
| Meter Start | Starting meter reading |
| Meter End | Ending meter reading |
| kWh Used | `meter_end − meter_start` |
| Electricity Cost | `kwh_used × price_per_kwh` (formatted as Rupiah) |
| Total | `total_amount` (formatted as Rupiah) |
| Status | "Lunas" (Paid) / "Belum Lunas" (Unpaid) — clickable badge |
| Actions | Generate Bill Text button, Delete button |

**Toggle Payment Status**:
- Clicking the status badge immediately calls `PATCH /api/bills/[id]` with the toggled `is_paid` value.
- UI updates optimistically.

**Generate Bill Text**:
- Opens a dialog with a pre-generated, human-readable billing message in Indonesian.
- The text includes: greeting, tenant name, room name, billing period, itemized cost breakdown, total amount, and payment instructions with the owner's bank account details.
- User can copy the text (e.g., to paste into WhatsApp).

**Delete Bill**:
- Confirmation dialog before deletion.
- Calls `DELETE /api/bills/[id]`.
- Row is removed from the table after deletion.

---

## 5. Bill Text Generation

The generated billing message follows this structure (in Bahasa Indonesia):

```
Tagihan Listrik - [Room Name]
Periode: [Month Name] [Year]
Tenant: [Tenant Name]

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

**Hardcoded Payment Details** (as of current implementation):
- Account Holder: `I KOMANG OKTARAMA BA`
- Bank: `Bank Mandiri`
- Account Number: `1450013849266`

---

## 6. Navigation

The application has 4 navigation links in the top navbar:

| Label | Route | Description |
|---|---|---|
| Dashboard | `/` | Monthly summary and status overview |
| Kamar | `/rooms` | Room management |
| Input Tagihan | `/billing` | Monthly meter reading input |
| Daftar Tagihan | `/billing-list` | Billing history and management |

The navbar highlights the currently active route.

---

## 7. Localization & Formatting

- **Language**: Bahasa Indonesia (UI labels, alerts, messages)
- **Currency**: IDR (Indonesian Rupiah) — formatted with dot-separated thousands (e.g., `Rp 1.500.000`)
- **Month Names**: Indonesian month names (e.g., "Januari", "Februari", ..., "Desember")
- **Date/Time**: No explicit timezone handling; relies on server/database defaults
- **HTML `lang` attribute**: Set to `"id"` (Indonesian) in the root layout

---

## 8. Error Handling

- API errors return HTTP 4xx/5xx with a JSON `{ error: string }` body.
- UI communicates errors via **toast notifications** (Sonner library).
- Form validation errors are shown inline via React Hook Form + Zod.
- 404 errors are returned by API routes when a room or bill ID is not found.

---

## 9. Known Constraints & Limitations

1. **No Authentication**: The application has no login/authentication system. Anyone who can access the URL has full read/write access.
2. **No Multi-Tenancy**: Designed for a single property owner; no concept of multiple users or properties.
3. **No Automated Tests**: There are no unit, integration, or end-to-end tests.
4. **No Audit Trail**: No history of changes; edits and deletions are permanent.
5. **Hardcoded Bank Details**: The owner's payment information is embedded in source code (`lib/helpers.ts`).
6. **Single-Currency**: Only IDR; no multi-currency support.
7. **No Notifications/Reminders**: The system generates bill text but does not send messages automatically.
8. **Year Range Limitation**: The billing input year dropdown only shows 3 years (previous, current, next).
