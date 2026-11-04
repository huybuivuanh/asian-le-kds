/**
 * Shared ordering for dine-in style line items (appetizer / table / to-go flags),
 * and optional kitchen-type ordering for tickets or lists.
 * Use with `groupOrderItemsByDisplaySection` for UI; print server can import the same helpers.
 */

import { KitchenType } from "@/types/enums";
import { preprocessOrderItems } from "./preprocessOrderItems";

export type OrderItemDisplayTier = 0 | 1 | 2;

const SECTION_TITLES: Record<OrderItemDisplayTier, string> = {
  0: "Appetizers",
  1: "For Table",
  2: "To Go",
};

/** Appetizers first, then table, then to-go. Appetizer wins if both flags are set. */
export function dineInItemSortTier(item: OrderItem): OrderItemDisplayTier {
  if (item.appetizer) return 0;
  if (item.togo) return 2;
  return 1;
}

export function sortOrderItemsForDisplay(items: OrderItem[]): OrderItem[] {
  const indexed = items.map((item, index) => ({ item, index }));
  indexed.sort((a, b) => {
    const ta = dineInItemSortTier(a.item);
    const tb = dineInItemSortTier(b.item);
    if (ta !== tb) return ta - tb;
    return compareByKitchenTypeThenName(a.item, b.item);
  });
  return indexed.map(({ item }) => item);
}

/**
 * Rank for sorting lines or menu items by station: Deep Fry → Both → Stir Fry → Other → Drink.
 * Lower values sort first.
 */
export function kitchenTypeSortRank(kitchenType: KitchenType): number {
  switch (kitchenType) {
    case KitchenType.DeepFry:
      return 0;
    case KitchenType.Both:
      return 1;
    case KitchenType.StirFry:
      return 2;
    case KitchenType.Other:
      return 3;
    case KitchenType.Drink:
      return 4;
    default:
      return 99;
  }
}

/** Within a tier: kitchen station first, then item name A→Z (matches POS). */
export function compareByKitchenTypeThenName(a: OrderItem, b: OrderItem): number {
  const ra = kitchenTypeSortRank(a.kitchenType);
  const rb = kitchenTypeSortRank(b.kitchenType);
  if (ra !== rb) return ra - rb;
  return a.name.localeCompare(b.name);
}

/** Stable sort by {@link kitchenTypeSortRank}, then original index within the same type. */
export function sortOrderItemsByKitchenType(items: OrderItem[]): OrderItem[] {
  const indexed = items.map((item, index) => ({ item, index }));
  indexed.sort((a, b) => {
    const ra = kitchenTypeSortRank(a.item.kitchenType);
    const rb = kitchenTypeSortRank(b.item.kitchenType);
    if (ra !== rb) return ra - rb;
    return a.index - b.index;
  });
  return indexed.map(({ item }) => item);
}

export type OrderItemDisplaySection = {
  tier: OrderItemDisplayTier;
  title: string;
  items: OrderItem[];
};

/** Sorted items split into non-empty sections with labels. */
export function groupOrderItemsByDisplaySection(
  items: OrderItem[],
): OrderItemDisplaySection[] {
  const sorted = sortOrderItemsForDisplay(preprocessOrderItems(items));
  if (sorted.length === 0) return [];

  const sections: OrderItemDisplaySection[] = [];
  const sectionIndexedItems: {
    tier: OrderItemDisplayTier;
    item: OrderItem;
    index: number;
  }[] = [];

  for (const [index, item] of sorted.entries()) {
    const tier = dineInItemSortTier(item);
    sectionIndexedItems.push({ tier, item, index });
  }

  // Split into contiguous tiers (Appetizers → Table → To Go), then group lines within each tier by kitchen station.
  const byTier: Record<
    OrderItemDisplayTier,
    { item: OrderItem; index: number }[]
  > = {
    0: [],
    1: [],
    2: [],
  };
  for (const entry of sectionIndexedItems)
    byTier[entry.tier].push({ item: entry.item, index: entry.index });

  for (const tier of [0, 1, 2] as const) {
    const tierItems = byTier[tier];
    if (tierItems.length === 0) continue;

    tierItems.sort((a, b) => {
      return compareByKitchenTypeThenName(a.item, b.item);
    });

    sections.push({
      tier,
      title: SECTION_TITLES[tier],
      items: tierItems.map(({ item }) => item),
    });
  }

  return sections;
}
