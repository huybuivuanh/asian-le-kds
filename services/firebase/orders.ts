import { DineInOrder, OrderItem, OrderStatus, OrderType, TakeOutOrder } from "@/types/types";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type DocumentChangeType,
} from "firebase/firestore";
import { firebase } from "./config";

export type OrderChangeHandler = (
  order: DineInOrder | TakeOutOrder,
  type: DocumentChangeType,
) => void;

export function subscribeToActiveDineInOrders(
  onChange: OrderChangeHandler,
): () => void {
  const q = query(
    collection(firebase.db,"dineInOrders"),
    where("status", "==", OrderStatus.InProgress),
    orderBy("createdAt", "asc"),
  );

  return onSnapshot(q, (snap) => {
    for (const change of snap.docChanges()) {
      const order = { id: change.doc.id, ...change.doc.data() } as DineInOrder;
      onChange(order, change.type);
    }
  });
}

export function subscribeToActiveAllOrders(
  onChange: OrderChangeHandler,
): () => void {
  const dineInQuery = query(
    collection(firebase.db,"dineInOrders"),
    where("status", "==", OrderStatus.InProgress),
    orderBy("createdAt", "asc"),
  );
  const takeOutQuery = query(
    collection(firebase.db,"takeOutOrders"),
    where("status", "==", OrderStatus.InProgress),
    orderBy("createdAt", "asc"),
  );

  const unsubDineIn = onSnapshot(dineInQuery, (snap) => {
    for (const change of snap.docChanges()) {
      const order = { id: change.doc.id, ...change.doc.data() } as DineInOrder;
      onChange(order, change.type);
    }
  });

  const unsubTakeOut = onSnapshot(takeOutQuery, (snap) => {
    for (const change of snap.docChanges()) {
      const order = { id: change.doc.id, ...change.doc.data() } as TakeOutOrder;
      onChange(order, change.type);
    }
  });

  return () => {
    unsubDineIn();
    unsubTakeOut();
  };
}

export async function updateOrderItems(
  orderId: string,
  orderItems: OrderItem[],
  collectionName: "dineInOrders" | "takeOutOrders" = "dineInOrders",
): Promise<void> {
  await updateDoc(doc(firebase.db,collectionName, orderId), { orderItems });
}

export function collectionForOrder(
  order: DineInOrder | TakeOutOrder,
): "dineInOrders" | "takeOutOrders" {
  return order.orderType === OrderType.DineIn ? "dineInOrders" : "takeOutOrders";
}
