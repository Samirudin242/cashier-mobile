# Cashier POS

A modern, offline-first mobile Point of Sale application built with React Native and Expo. Designed for small-to-medium retail stores with owner and employee roles, local-first data storage, and manual cloud sync via Supabase.

## Architecture

**Offline-first** — all business data (products, transactions, customers, attendance) is stored in SQLite on the device. Data is synced to Supabase manually through the Sync Center. The app works fully without an internet connection except for login/logout (which requires network to enforce single-device access).

```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│   Screens    │ ──▶ │  Repositories │ ──▶ │   SQLite     │
│   (UI)       │     │  (Data Layer) │     │   (Local DB) │
└──────────────┘     └───────┬───────┘     └──────────────┘
                             │
                     ┌───────▼───────┐     ┌──────────────┐
                     │ Sync Services │ ──▶ │  Supabase    │
                     │ (Upload/Down) │     │  (Cloud)     │
                     └───────────────┘     └──────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (TypeScript) |
| Local Database | expo-sqlite (SQLite with WAL mode) |
| Cloud Sync | Supabase JS |
| State Management | Zustand |
| Navigation | React Navigation (Bottom Tabs + Native Stack) |
| Icons | lucide-react-native |
| Auth Persistence | expo-secure-store |

## Getting Started

### Prerequisites

- Node.js >= 20
- Expo CLI (`npx expo`)
- iOS Simulator or Android Emulator (or Expo Go on a physical device)

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npx expo start
```

### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Update `src/config/supabase.ts` with your project URL and anon key:

```typescript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

3. Create a `users` table in Supabase with these columns:

| Column | Type | Notes |
|---|---|---|
| id | text | Primary key |
| name | text | |
| role | text | `owner` or `employee` |
| access_code | text | Unique |
| store_id | text | |
| is_active | boolean | |
| logged_in_device_id | text | Nullable, for device lock |
| created_at | timestamptz | |

4. Insert the same seed users into your Supabase `users` table (see access codes below).

5. Create matching tables for `products`, `transactions`, `customers`, `attendance` in Supabase for sync to work.

## Authentication

Users log in with a **pre-assigned access code**. The code determines their role (owner or employee). Sessions never expire — they persist until the user manually logs out.

**Device lock:** Each access code can only be active on one device at a time. Login checks Supabase to verify the code isn't already in use elsewhere. The other device must logout first.

### Default Access Codes

| Name | Role | Access Code |
|---|---|---|
| Pemilik Toko | Owner | `OWNER2024` |
| Kasir Satu | Employee | `KASIR001` |
| Kasir Dua | Employee | `KASIR002` |
| Kasir Tiga | Employee | `KASIR003` |

These are seeded into the local SQLite database on first launch.

## Features

### Employee
- **Home** — daily sales stats, quick actions
- **Products** — browse, search, view product details
- **New Sale** — product grid, cart, checkout with payment method selection
- **Transaction History** — view past transactions with details
- **Attendance** — clock in/out, view attendance history
- **Sync Center** — upload local data to cloud
- **Profile** — performance stats, attendance summary

### Owner
- **Dashboard** — revenue overview, product count, pending sync alerts
- **Products** — full CRUD (create, read, update, delete)
- **Transactions** — view all transactions with details
- **Reports** — today/7-day revenue, daily breakdown, averages
- **Sync Center** — upload and download sync
- **Settings** — store info, clear local data, logout

### Checkout Flow
1. Select products from the grid (tap to add to cart)
2. Review cart — adjust quantities, remove items
3. Enter customer info and WhatsApp number (optional)
4. Select payment method (Cash / Transfer / QRIS)
5. Apply discount (optional)
6. Complete transaction
7. Success screen with options to print receipt or send via WhatsApp

### Sync
- **Upload Sync** — pushes all `pending_upload` and `failed` records to Supabase
- **Download Sync** — fetches latest cloud data into local SQLite
- **Sync Status Badges** — Pending (yellow), Synced (green), Failed (red)
- **Activity Log** — recent sync operations with success/failure status
- **Conflict Resolution** — last-write-wins based on `updated_at` timestamp
- **Soft Delete** — records are marked `is_deleted = true` with `sync_status = pending_delete`

## Project Structure

```
src/
├── components/ui/          # Reusable design system components
│   ├── AppScreen.tsx       # Safe-area screen wrapper with scroll
│   ├── AppCard.tsx         # Card with shadow and optional press
│   ├── AppButton.tsx       # Button with variants, sizes, loading
│   ├── AppInput.tsx        # Text input with label, icon, error
│   ├── AppText.tsx         # Typography with variants
│   ├── AppBadge.tsx        # Badge + SyncBadge component
│   ├── AppStatCard.tsx     # Stat display card with icon
│   ├── AppSectionHeader.tsx
│   ├── AppListItem.tsx
│   ├── AppEmptyState.tsx
│   ├── AppLoader.tsx
│   └── AppModal.tsx
├── config/
│   ├── theme.ts            # Colors, spacing, typography, shadows
│   └── supabase.ts         # Supabase client
├── database/sqlite/
│   ├── client.ts           # SQLite connection (WAL mode)
│   ├── schema/tables.ts    # All CREATE TABLE statements
│   ├── schema/seed.ts      # Seed users with access codes
│   └── migrations/         # DB initialization
├── repositories/           # Data access layer
│   ├── userRepository.ts
│   ├── productRepository.ts
│   ├── transactionRepository.ts
│   ├── customerRepository.ts
│   ├── attendanceRepository.ts
│   └── syncRepository.ts
├── services/sync/
│   ├── uploadSyncService.ts
│   └── downloadSyncService.ts
├── stores/
│   ├── authStore.ts        # Auth state + device lock logic
│   └── cartStore.ts        # Shopping cart state
├── screens/
│   ├── auth/               # Login
│   ├── home/               # Dashboard
│   ├── products/           # List, Form, Detail
│   ├── checkout/           # Product grid, Cart review, Success
│   ├── transactions/       # List, Detail
│   ├── sync/               # Sync Center
│   ├── reports/            # Sales reports
│   ├── attendance/         # Clock in/out
│   ├── settings/           # Owner settings
│   └── profile/            # Employee profile
├── navigation/
│   └── AppNavigator.tsx    # Tab + Stack navigation
├── types/
│   └── index.ts            # TypeScript interfaces
└── utils/
    └── helpers.ts          # Currency format, date utils, ID generation
```

## Design System

| Token | Value |
|---|---|
| Primary | `#4F46E5` (Indigo) |
| Background | `#F9FAFB` |
| Card | `#FFFFFF` |
| Text | `#111827` |
| Success | `#16A34A` |
| Warning | `#F59E0B` |
| Error | `#DC2626` |
| Spacing scale | 4, 8, 12, 16, 20, 24, 32, 48 |
| Border radius | 6, 8, 12, 16 |

## Data Models

All business entities include sync tracking fields:

| Field | Purpose |
|---|---|
| `local_id` | Primary key (UUID, generated on device) |
| `cloud_id` | Supabase row ID (set after sync) |
| `sync_status` | `pending_upload` / `synced` / `failed` / `pending_delete` / `conflict` |
| `sync_error` | Last sync error message |
| `created_at_local` | Local creation timestamp |
| `updated_at_local` | Local update timestamp |
| `last_synced_at` | Last successful sync time |
| `device_id` | Device that created/updated the record |
| `created_by` | User ID who created |
| `updated_by` | User ID who last updated |
| `is_deleted` | Soft delete flag |

## Scripts

```bash
npm start       # Start Expo dev server
npm run ios     # Start on iOS simulator
npm run android # Start on Android emulator
```

## License

Private project.
