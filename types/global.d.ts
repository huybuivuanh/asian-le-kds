import type { Timestamp } from "firebase/firestore";
import type { DiscountType, KitchenType, OrderStatus, OrderType } from "./enums";

export {};

declare global {
  interface OrderItemOption {
    name: string;
    price: number;
    quantity: number;
  }

  interface OrderItem {
    id?: string;
    name: string;
    price: number;
    quantity: number;
    options?: OrderItemOption[];
    changes?: ItemChange[];
    extras?: AddExtra[];
    togo: boolean;
    appetizer: boolean;
    kitchenType: KitchenType;
    instructions?: string;
    paid: boolean;
    completed: boolean;
  }

  interface ItemChange {
    from: string;
    to: string;
    price: number;
  }

  interface AddExtra {
    description: string;
    price: number;
  }

  interface Discount {
    discountType: DiscountType;
    discountValue: number;
    discountAmount: number;
    taxableSubtotal: number;
  }

  interface TaxBreakDown {
    subTotal: number;
    discount?: Discount;
    pst: number;
    gst: number;
    total: number;
  }

  interface Order {
    id?: string;
    staff: string;
    orderType: OrderType;
    orderItems: OrderItem[];
    taxBreakDown: TaxBreakDown;
    status: OrderStatus;
    printed: boolean;
    createdAt: Timestamp;
  }

  interface DineInOrder extends Order {
    orderType: OrderType.DineIn;
    tableNumber: string;
    guests: number;
  }
}
