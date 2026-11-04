# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**AsianLeKDS** is a Kitchen Display System (KDS) with a single **Dine In** screen for servers to track food delivery and table completion. It listens to Firestore via `onSnapshot`, renders a horizontal scrollable queue of order cards, and syncs item completion state back to Firestore.

## Commands

```bash
npx expo start          # start dev server (scan QR for device)
npx expo start --android
npx expo start --ios
npx expo start --web
```

There are no test or lint scripts configured yet.

## Stack

- **Expo** SDK 58 with **expo-router** (file-based routing under `app/`)
- **React Native** 0.88 + **React** 19.3
- **NativeWind** v4 + **Tailwind CSS** v3 for styling (`className` prop)
- **Firebase JS SDK** (`firebase/firestore`) for Firestore real-time listener
- **AsyncStorage** (`@react-native-async-storage/async-storage`) — only used for Firebase Auth session persistence
- **TypeScript** (strict mode, `@/*` path alias resolves to repo root)

## File layout

```
app/
  _layout.tsx              # expo-router root layout — auth redirects, keep-awake, 5-min reload
  index.tsx                # Dine In screen (the only screen after login)
  login.tsx                # login screen
components/kds/
  ConnectionBanner.tsx     # full-screen no-connection modal overlay
  KDSHeader.tsx            # title bar with screen title, sign out
  OrderCard.tsx            # single order card (header, item list, complete button)
  OrderItemRow.tsx         # individual item row with checkbox toggle
  QueueDivider.tsx         # thin vertical separator between active and completed sections
config/
  demo.ts                  # DEMO_EMAIL constant for demo mode db switching
constants/
  colors.ts                # BRAND color constant (#22c87a) for use in JS style objects
hooks/
  useKDSOrders.ts          # all KDS state — Firestore subscription, toggle, complete, connection state
services/firebase/
  config.ts                # Firebase app + Firestore db init; firebase wrapper + activateDemoDb/activateProductionDb
  auth.ts                  # login / logout; switches db on auth state change
  orders.ts                # subscribeToActiveDineInOrders, updateOrderItems
types/
  global.d.ts              # global domain interfaces (OrderItem, DineInOrder, …) — no import needed, same pattern as POS
  enums.ts                 # runtime enums (KitchenType, OrderStatus, OrderType, DiscountType) — import from `@/types/enums`
utils/
  firestore.ts             # generateFirestoreId — generates a local Firestore document ID without a network call
  groupOrderItems.ts       # groupOrderItemsBySignature — merges duplicate lines, sums qty
  preprocessOrderItems.ts  # preprocessOrderItems — embeds option abbreviations into name
  orderItemSections.ts     # dineInItemSortTier, kitchenTypeSortRank, groupOrderItemsByDisplaySection
```

## Architecture

### State model (`hooks/useKDSOrders.ts`)

```typescript
useKDSOrders(
  subscribe: (onChange: OrderChangeHandler, onConnectionChange?: ConnectionStateHandler) => () => void,
)
// returns: { activeOrders, completedOrders, toggleItem, completeOrder, isConnected }
```

- `activeOrders` / `completedOrders` derived by filtering `kdsOrders`, sorted by `createdAt asc`.
- Max **3 completed** orders kept; oldest dropped when a 4th completes (enforced in `completeOrder`).
- `"modified"` events merge per-item local completion state — items that already existed keep their local `completed` flag, items newly added by POS default to `false`. If any item is uncompleted, the order is removed from `completedIds` and re-enters the active queue.
- `isConnected` starts `true`, only flips to `false` after the first live Firestore snapshot is received and then `fromCache` becomes `true` again (avoids false alarms during initial load).

### Completion logic

- **Auto-complete**: `OrderCard` `useEffect` on `isCompleted` — fires `onComplete()` via a stable ref pattern (avoids stale-closure and infinite-loop issues).
- **Manual complete**: "Complete order" button visible on all active orders.
- Toggles and completions are written to Firestore via `updateOrderItems`. `completedIds` (in-memory ref) tracks orders completed on this device.

### Connection state (`services/firebase/orders.ts` + `hooks/useKDSOrders.ts`)

- `subscribeToActiveDineInOrders` accepts an optional `onConnectionChange?: (connected: boolean) => void`.
- `onSnapshot` uses `{ includeMetadataChanges: true }` so the callback fires when `snapshot.metadata.fromCache` changes.
- `onConnectionChange(!snap.metadata.fromCache)` is called on every snapshot; error callbacks call `onConnectionChange(false)` and log to console.
- `useKDSOrders` tracks `hasReceivedLiveData` (ref) — the `isConnected` state only updates after the first live sync, preventing a false "disconnected" flash on startup.
- The `ConnectionBanner` component renders as a `Modal` overlay: dims the screen, shows a white card with a red WiFi icon, blocks all interaction until connection restores.

### Demo mode (`config/demo.ts` + `services/firebase/config.ts`)

The app supports a separate Firestore database for app-store demo review, activated automatically when the demo account logs in — no rebuild needed.

```
Production db: (default)   — real restaurant data
Demo db:       "demo"      — safe sandbox, seeded with sample orders
```

- `services/firebase/config.ts` exports a mutable `firebase` object (`{ db }`) instead of a plain `db` value. All Firestore calls read `firebase.db`.
- `activateDemoDb()` / `activateProductionDb()` swap `firebase.db` synchronously — takes effect on the next Firestore call.
- `services/firebase/auth.ts` calls the appropriate activator inside `onAuthStateChanged` before setting React state, so the correct db is always active before any subscription starts.
- Demo email is set in `config/demo.ts` as `DEMO_EMAIL`.

### Firestore listeners (`services/firebase/orders.ts`)

- `subscribeToActiveDineInOrders` — listens to `dineInOrders` where `status == "InProgress"`, ordered by `createdAt asc`.
- `updateOrderItems(orderId, items)` — writes item completion state back to `dineInOrders`.

> **Note**: `where("status") + orderBy("createdAt")` requires a composite Firestore index on `dineInOrders`.

### Order types (`types/global.d.ts` + `types/enums.ts`)

- Interfaces are declared in `declare global` and used without imports. Enums live in `enums.ts` (they are runtime values, so they can't go in a `.d.ts`).

- `DineInOrder` — extends `Order` with `tableNumber: string`, `guests: number`.

### OrderCard display

White card. Header: centered `Table {N}` → guests + time row → staff row.

Items sorted into three tiers (Appetizers → For Table → To Go), then by kitchen type (Deep Fry → Both → Stir Fry → Other), then item name A→Z within each tier — same as POS (`compareByKitchenTypeThenName`). Tier badges: amber (Appetizers), slate (For Table), teal (To Go) — all with white text.

Footer: "Complete order" button (hidden on completed orders). No progress bar.

Drinks (`KitchenType.Drink`) are filtered out of the display.

### Item processing pipeline

When an order is added or modified, items go through:
1. Filter out drinks (`KitchenType.Drink`)
2. `preprocessOrderItems` — embeds option abbreviations into the name (e.g. `#3/ER/Rice`)

### Auto-reload

`app/_layout.tsx` reloads the app (`Updates.reloadAsync`) after **5 minutes** in the background.

### Styling rules

- Use `className` for all styles (NativeWind).
- **Exception**: dynamic/runtime values must use the inline `style` prop — NativeWind cannot interpolate runtime values in class strings.
- Brand color `#22c87a` — use `bg-brand` / `text-brand` in classNames; use `BRAND` from `constants/colors.ts` in JS style objects (e.g. `ActivityIndicator color`).
- The horizontal queue `ScrollView` uses `horizontal`; each card uses `flexShrink: 0`. Item lists inside cards use a nested `ScrollView` with `nestedScrollEnabled`.
