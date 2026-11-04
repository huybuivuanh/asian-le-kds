import {
  type ConnectionStateHandler,
  type OrderChangeHandler,
  updateOrderItems,
} from "@/services/firebase/orders";
import { DineInOrder, KitchenType, OrderItem, OrderStatus } from "@/types/types";
import { preprocessOrderItems } from "@/utils/preprocessOrderItems";
import { useEffect, useRef, useState } from "react";

export interface KDSOrder {
  order: DineInOrder;
  items: OrderItem[];
}

const MAX_COMPLETED = 3;

const isOrderCompleted = (o: KDSOrder): boolean =>
  o.items.length > 0 && o.items.every((i) => i.completed);

function buildDisplayItems(order: DineInOrder): OrderItem[] {
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
) {
  const [kdsOrders, setKdsOrders] = useState<KDSOrder[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const completedIds = useRef<Set<string>>(new Set());
  const hasReceivedLiveData = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribe(
      (order, type) => {
        if (type === "added") {
          const drinkUpdated = withDrinksCompleted(order.orderItems);
          if (drinkUpdated) {
            void updateOrderItems(order.id!, drinkUpdated);
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
              }

              return { ...o, order, items: mergedItems };
            }),
          );
        }

        if (type === "removed") {
          const id = order.id!;
          completedIds.current.delete(id);

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

    return () => { unsubscribe(); };
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
    }

    void updateOrderItems(orderId, newRawItems);
  };

  const completeOrder = (orderId: string) => {
    const orderEntry = kdsOrders.find((o) => o.order.id === orderId);
    if (!orderEntry) return;

    completedIds.current.add(orderId);

    const alreadyCompleted = isOrderCompleted(orderEntry);

    const newRawItems = orderEntry.order.orderItems.map((raw) => ({
      ...raw,
      completed: true,
    }));

    setKdsOrders((prev) =>
      alreadyCompleted
        ? prev
        : prev.map((o) =>
            o.order.id === orderId
              ? {
                  ...o,
                  order: { ...o.order, orderItems: newRawItems },
                  items: o.items.map((i) => ({ ...i, completed: true })),
                }
              : o,
          ),
    );

    if (!alreadyCompleted) {
      void updateOrderItems(orderId, newRawItems);
    }
  };

  const sorted = [...kdsOrders].sort(
    (a, b) => a.order.createdAt.toMillis() - b.order.createdAt.toMillis(),
  );
  const activeOrders = sorted.filter((o) => !isOrderCompleted(o));
  const completedOrders = sorted.filter(isOrderCompleted).slice(-MAX_COMPLETED);

  return { activeOrders, completedOrders, toggleItem, completeOrder, isConnected };
}
