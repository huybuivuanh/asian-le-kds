# AsianLeKDS — Kitchen Display System

A real-time kitchen display system built with Expo and Firebase, designed for restaurant use. Runs on any Android or iOS tablet.

## Features

- **Dine In display** — tracks food delivery per table; completion state syncs to Firestore so servers see progress in real time
- Real-time Firestore subscriptions with automatic reconnection
- No-connection overlay that blocks interaction and dismisses automatically when connection restores
- Auto-reload after 5 minutes in background (keeps the display fresh overnight)
- Staff/admin only — sign-in checks the account's custom claims; anyone else is signed back out with a message
- Demo mode — the App Store review account works in the separate **Demo business**; no rebuild needed

## Stack

| | |
|---|---|
| Framework | Expo SDK 58, expo-router |
| UI | React Native 0.88, NativeWind v4, Tailwind CSS v3 |
| Backend | Firebase JS SDK v12, Firestore real-time listeners |
| Language | TypeScript (strict) |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create `.env.local` at the repo root:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

Fill in the values from the shared **`asianlepos`** Firebase project (Project Settings → Your apps → SDK setup).

### 3. Firestore data

All data lives under `businesses/{businessId}/…` in the shared project. The business comes
from the signed-in account's `businessId` claim (saved on the device so the KDS can restart
offline for the same account). Paths are built with `bizCol` / `bizDoc` in
`services/firebase/business.ts`.

| Collection (in the business) | Documents |
|---|---|
| `dineInOrders` | `DineInOrder` — includes `tableNumber`, `guests`, `orderItems`, `status`, `createdAt` |

The KDS listens to orders with `status == "InProgress"`, ordered by `createdAt`. The index and
the security rules are deployed from the `asian-le-firebase` repo, not from here.

### 4. Firebase Auth

Staff sign in with email/password. An account can use the KDS only if it has custom claims
`{ businessId, role: "staff" | "admin" }`. Set them with `scripts/set-claims.mjs` in
`asian-le-firebase` (or create the user in pos-admin).

### 5. Run the app

```bash
npx expo start          # opens Expo dev tools — scan QR with Expo Go
npx expo start --android
npx expo start --ios
```

## Demo Mode

App Store review uses the **Demo business** in the same project. The review account
(`review@asianle.ca`) has a `businessId` claim pointing at Demo, so everything it sees and
writes stays in Demo. There's no separate database and no rebuild. The Demo business and the
review accounts are created by `scripts/seed-demo.mjs` in `asian-le-firebase`.

## Project Structure

```
app/
  _layout.tsx              # Root layout — auth guard, keep-awake, 5-min reload
  index.tsx                # Dine In screen
  login.tsx                # Login screen
components/kds/
  ConnectionBanner.tsx     # Full-screen no-connection modal
  KDSHeader.tsx            # Header bar (title, counts, sign out)
  OrderCard.tsx            # Order card (header, items, complete button)
  OrderItemRow.tsx         # Individual item row with checkbox
  QueueDivider.tsx         # Separator between active and completed cards
constants/
  colors.ts                # Brand color constant
hooks/
  useKDSOrders.ts          # Core KDS state hook
services/firebase/
  config.ts                # Firebase init
  business.ts              # Current business from the businessId claim; bizCol / bizDoc
  auth.ts                  # Login / logout; only staff/admin claims get in
  orders.ts                # Firestore subscription functions
types/
  global.d.ts              # Global domain interfaces
  enums.ts                 # Runtime enums
utils/
  firestore.ts             # generateFirestoreId
  groupOrderItems.ts       # Order item merging and splitting logic
  preprocessOrderItems.ts  # Option abbreviation embedding
  orderItemSections.ts     # Sort tiers and kitchen type ranks
```

## How Completion Works

- Checking all items or pressing "Complete order" marks the order done
- Completion state is written back to Firestore (`orderItems[].completed`)
- Completed orders stay visible (dimmed) until Firestore removes them

### New items added mid-order (POS)
When POS adds an item to an already-completed order, the order automatically returns to the active queue with existing items checked and the new item unchecked.

## Connection Handling

When the Firestore connection is lost, a modal overlay appears automatically:
- Dims the screen and blocks all interaction
- Shows "No Internet Connection" with instructions
- Dismisses automatically when the connection restores — no manual action needed

The overlay only appears after the first successful live sync (no false alarm on startup).
