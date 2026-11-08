import { OrderStatus } from "@/types/enums";
import {
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type DocumentChangeType,
} from "firebase/firestore";
import { bizCol, bizDoc } from "./business";

export type OrderChangeHandler = (
  order: DineInOrder,
  type: DocumentChangeType,
) => void;

export type ConnectionStateHandler = (connected: boolean) => void;

export function subscribeToActiveDineInOrders(
  onChange: OrderChangeHandler,
  onConnectionChange?: ConnectionStateHandler,
): () => void {
  const q = query(
    bizCol("dineInOrders"),
    where("status", "==", OrderStatus.InProgress),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) => {
      onConnectionChange?.(!snap.metadata.fromCache);
      for (const change of snap.docChanges()) {
        const order = { id: change.doc.id, ...change.doc.data() } as DineInOrder;
        onChange(order, change.type);
      }
    },
    (error) => {
      console.error("Firestore (dineInOrders) error:", error);
      onConnectionChange?.(false);
    },
  );
}

export async function updateOrderItems(
  orderId: string,
  orderItems: OrderItem[],
): Promise<void> {
  await updateDoc(bizDoc("dineInOrders", orderId), { orderItems });
}
