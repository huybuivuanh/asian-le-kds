# AsianLeKDS — Kitchen Display System

A real-time kitchen display system built with Expo and Firebase, designed for restaurant use. Runs on any Android or iOS tablet.

## Features

- **Dine In tab** — tracks food delivery per table; completion state syncs to Firestore so servers see progress in real time
- **Orders tab** — cooks see all active orders (dine-in + take-out); completion is local only
- Real-time Firestore subscriptions with automatic reconnection
- No-connection overlay that blocks interaction and dismisses automatically when connection restores
- Pre-order support with 30-minute lead scheduling
- Auto-reload after 5 minutes in background (keeps the display fresh overnight)
- Demo mode — separate Firestore database activated by logging in with a demo account; no rebuild needed

## Stack

| | |
|---|---|
| Framework | Expo ~54, expo-router ~6 |
| UI | React Native 0.81, NativeWind v4, Tailwind CSS v3 |
| Backend | Firebase JS SDK v12, Firestore real-time listeners |
| Persistence | AsyncStorage (Orders tab completion state) |
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

Fill in the values from your Firebase project settings (Project Settings → Your apps → SDK setup).

### 3. Firestore collections

The app reads from two collections:

| Collection | Documents |
|---|---|
| `dineInOrders` | `DineInOrder` — includes `tableNumber`, `guests`, `orderItems`, `status`, `createdAt` |
| `takeOutOrders` | `TakeOutOrder` — includes `customerName?`, `phoneNumber?`, `fulfillment`, `orderItems`, `status`, `createdAt` |

Both collections need a **composite index**: `status ASC, createdAt ASC`. Firebase will prompt you with a direct link to create it when you first run the app.

### 4. Firebase Auth

Create at least one email/password user in Firebase Authentication for staff login.

### 5. Run the app

```bash
npx expo start          # opens Expo dev tools — scan QR with Expo Go
npx expo start --android
npx expo start --ios
```

## Demo Mode

The app supports a separate `demo` Firestore database for app-store review or client demos. No rebuild is required — the database is selected automatically at login.

**Setup:**

1. In Firebase Console → Firestore → Databases, create a new database with ID `demo` (same region as production). Seed it with sample orders.
2. Create a Firebase Auth user with the demo email (see `config/demo.ts`).
3. Update `DEMO_EMAIL` in `config/demo.ts` if needed.

When the demo account logs in, all Firestore reads and writes go to the `demo` database. Logging out and back in as a real account switches back to production instantly.

## Project Structure

```
app/
  _layout.tsx              # Root layout — auth guard, keep-awake, 5-min reload
  login.tsx                # Login screen
  (tabs)/
    _layout.tsx            # Tab navigator
    index.tsx              # Dine In screen
    orders.tsx             # Orders screen
components/kds/
  ConnectionBanner.tsx     # Full-screen no-connection modal
  KDSHeader.tsx            # Header bar (title, counts, sign out)
  OrderCard.tsx            # Order card (header, items, complete button)
  OrderItemRow.tsx         # Individual item row with checkbox
  QueueDivider.tsx         # Separator between active and completed cards
config/
  demo.ts                  # Demo account email
constants/
  colors.ts                # Brand color constant
hooks/
  useKDSOrders.ts          # Core KDS state hook
services/firebase/
  config.ts                # Firebase init + demo db switching
  auth.ts                  # Auth helpers + db activation on login
  orders.ts                # Firestore subscription functions
types/
  types.ts                 # Domain types
utils/
  firestore.ts             # generateFirestoreId
  helper.ts                # takeoutFulfillmentIsScheduled, formatPhone
  groupOrderItems.ts       # Order item merging and splitting logic
  preprocessOrderItems.ts  # Option abbreviation embedding
  orderItemSections.ts     # Sort tiers and kitchen type ranks
```

## How Completion Works

### Dine In tab
- Checking all items or pressing "Complete order" marks the order done
- Completion state is written back to Firestore (`orderItems[].completed`)
- Completed orders stay visible (dimmed) until Firestore removes them

### Orders tab
- Same UI, but all state is local only — nothing is written to Firestore
- Completed order IDs are persisted in AsyncStorage under `kds_completed_orders`
- State survives the 5-minute auto-reload

### New items added mid-order (POS)
When POS adds an item to an already-completed order, the order automatically returns to the active queue with existing items checked and the new item unchecked.

## Connection Handling

When the Firestore connection is lost, a modal overlay appears automatically:
- Dims the screen and blocks all interaction
- Shows "No Internet Connection" with instructions
- Dismisses automatically when the connection restores — no manual action needed

The overlay only appears after the first successful live sync (no false alarm on startup).
