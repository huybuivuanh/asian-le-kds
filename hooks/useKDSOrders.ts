import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  type ConnectionStateHandler,
  type OrderChangeHandler,
  collectionForOrder,
  updateOrderItems,
} from "@/services/firebase/orders";
import {
  DineInOrder,
  KitchenType,
  OrderItem,
  OrderStatus,
  OrderType,
  TakeOutOrder,
} from "@/types/types";
import { preprocessOrderItems } from "@/utils/preprocessOrderItems";
import { useEffect, useRef, useState } from "react";

export interface KDSOrder {
  order: DineInOrder | TakeOutOrder;
  items: OrderItem[];
}

const MAX_COMPLETED = 3;
const PRE_ORDER_LEAD_MS = 30 * 60 * 1000;

const isOrderCompleted = (o: KDSOrder): boolean =>
  o.items.length > 0 && o.items.every((i) => i.completed);

function buildDisplayItems(order: DineInOrder | TakeOutOrder): OrderItem[] {
  return preprocessOrderItems(
    order.orderItems.filter((i) => i.kitchenType !== KitchenType.Drink),
  );
}

function withDrinksCompleted(orderItems: OrderItem[]): OrderItem[] | null {
  const needsUpdate = orderItems.some(
    (i) => i.kitchenType === KitchenType.Drink && !i.completed,
  );
  if (!needsUpdate) return null;
  return orderItems.map((i) =>
    i.kitchenType === KitchenType.Drink ? { ...i, completed: true } : i,
  );
}

export function useKDSOrders(
  subscribe: (onChange: OrderChangeHandler, onConnectionChange?: ConnectionStateHandler) => () => void,
  storageKey?: string,
  localOnly = false,
) {
  const [kdsOrders, setKdsOrders] = useState<KDSOrder[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const completedIds = useRef<Set<string>>(new Set());
  const hasReceivedLiveData = useRef(false);

  const saveIds = () => {
    if (!storageKey) return;
    void AsyncStorage.setItem(storageKey, JSON.stringify([...completedIds.current]));
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const startSubscription = () => {
      unsubscribe = subscribe(
        (order, type) => {
          if (type === "added") {
            const drinkUpdated = withDrinksCompleted(order.orderItems);
            if (drinkUpdated && !localOnly) {
              void updateOrderItems(order.id!, drinkUpdated, collectionForOrder(order));
            }
            const effectiveOrder = drinkUpdated
              ? { ...order, orderItems: drinkUpdated }
              : order;

            setKdsOrders((prev) => {
              if (prev.find((o) => o.order.id === order.id)) return prev;
              const wasCompleted = completedIds.current.has(order.id!);
              const items = buildDisplayItems(effectiveOrder);
              return [
                ...prev,
                {
                  order: effectiveOrder,
                  items: wasCompleted
                    ? items.map((i) => ({ ...i, completed: true }))
                    : items,
                },
              ];
            });
          }

          if (type === "modified") {
            setKdsOrders((prev) =>
              prev.map((o) => {
                if (o.order.id !== order.id) return o;
                const newItems = buildDisplayItems(order);
                const wasLocallyCompleted = completedIds.current.has(order.id!);

                if (!wasLocallyCompleted) {
                  return { ...o, order, items: newItems };
                }

                // Preserve per-item local completion; items added by POS default to false
                const localCompletionByKey = new Map(
                  o.items.map((i) => [i.id ?? i.name, i.completed]),
                );
                const mergedItems = newItems.map((i) => ({
                  ...i,
                  completed: localCompletionByKey.get(i.id ?? i.name) ?? false,
                }));

                // New item arrived — un-complete the order so it re-enters the active queue
                if (mergedItems.some((i) => !i.completed)) {
                  completedIds.current.delete(order.id!);
                  saveIds();
                }

                return { ...o, order, items: mergedItems };
              }),
            );
          }

          if (type === "removed") {
            const id = order.id!;
            completedIds.current.delete(id);
            saveIds();

            if (order.status === OrderStatus.Completed) {
              setKdsOrders((prev) =>
                prev.map((o) =>
                  o.order.id === id && !isOrderCompleted(o)
                    ? { ...o, items: o.items.map((i) => ({ ...i, completed: true })) }
                    : o,
                ),
              );
            } else {
              setKdsOrders((prev) => prev.filter((o) => o.order.id !== id));
            }
          }
        },
        (connected: boolean) => {
          if (connected) hasReceivedLiveData.current = true;
          if (hasReceivedLiveData.current) setIsConnected(connected);
        },
      );
    };

    if (storageKey) {
      AsyncStorage.getItem(storageKey)
        .then((raw) => {
          if (raw) {
            const ids: string[] = JSON.parse(raw) as string[];
            completedIds.current = new Set(ids);
          }
        })
        .catch((e: unknown) => { console.error("AsyncStorage read error:", e); })
        .finally(() => { startSubscription(); });
    } else {
      startSubscription();
    }

    return () => { unsubscribe?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleItem = (orderId: string, itemIndex: number) => {
    const orderEntry = kdsOrders.find((o) => o.order.id === orderId);
    if (!orderEntry) return;

    const newCompleted = !orderEntry.items[itemIndex].completed;
    const targetId = orderEntry.items[itemIndex].id;

    const newRawItems = orderEntry.order.orderItems.map((raw) =>
      raw.id === targetId ? { ...raw, completed: newCompleted } : raw,
    );

    setKdsOrders((prev) =>
      prev.map((o) => {
        if (o.order.id !== orderId) return o;
        const items = o.items.map((item, i) =>
          i === itemIndex ? { ...item, completed: newCompleted } : item,
        );
        return { ...o, order: { ...o.order, orderItems: newRawItems }, items };
      }),
    );

    if (!newCompleted && completedIds.current.has(orderId)) {
      completedIds.current.delete(orderId);
      saveIds();
    }

    if (!localOnly) {
      void updateOrderItems(orderId, newRawItems, collectionForOrder(orderEntry.order));
    }
  };

  const completeOrder = (orderId: string) => {
    const orderEntry = kdsOrders.find((o) => o.order.id === orderId);
    if (!orderEntry) return;

    completedIds.current.add(orderId);
    saveIds();

    const alreadyCompleted = isOrderCompleted(orderEntry);

    const newRawItems = orderEntry.order.orderItems.map((raw) => ({
      ...raw,
      completed: true,
    }));

    setKdsOrders((prev) => {
      const updated = alreadyCompleted
        ? prev
        : prev.map((o) =>
            o.order.id === orderId
              ? {
                  ...o,
                  order: { ...o.order, orderItems: newRawItems },
                  items: o.items.map((i) => ({ ...i, completed: true })),
                }
              : o,
          );
      const completed = updated.filter(isOrderCompleted);
      const overflow = completed.slice(
        0,
        Math.max(0, completed.length - MAX_COMPLETED),
      );
      const removeIds = new Set(overflow.map((o) => o.order.id));
      return updated.filter((o) => !removeIds.has(o.order.id ?? ""));
    });

    if (!alreadyCompleted && !localOnly) {
      void updateOrderItems(orderId, newRawItems, collectionForOrder(orderEntry.order));
    }
  };

  const sortKey = (o: KDSOrder): number => {
    const { order } = o;
    if (order.orderType === OrderType.TakeOut && order.fulfillment.kind === "scheduled") {
      return order.fulfillment.scheduledAt.toMillis() - PRE_ORDER_LEAD_MS;
    }
    return order.createdAt.toMillis();
  };
  const sorted = [...kdsOrders].sort((a, b) => sortKey(a) - sortKey(b));
  const activeOrders = sorted.filter((o) => !isOrderCompleted(o));
  const completedOrders = sorted.filter(isOrderCompleted);

  return { activeOrders, completedOrders, toggleItem, completeOrder, isConnected };
}
