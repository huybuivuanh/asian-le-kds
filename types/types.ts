import { Timestamp } from "firebase/firestore";

export enum KitchenType {
  DeepFry = "Deep Fry",
  StirFry = "Stir Fry",
  Other = "Other",
  Both = "Both",
  Drink = "Drink",
}

export enum OrderStatus {
  InProgress = "InProgress",
  Completed = "Completed",
  Cancelled = "Cancelled",
}

export enum OrderType {
  DineIn = "Dine In",
  TakeOut = "Take Out",
}

export enum DiscountType {
  None = "None",
  Amount = "Amount",
  Percent = "Percent",
}

export interface OrderItemOption {
  name: string;
  price: number;
  quantity: number;
}

export interface OrderItem {
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

export interface ItemChange {
  from: string;
  to: string;
  price: number;
}

export interface AddExtra {
  description: string;
  price: number;
}

export interface Discount {
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxableSubtotal: number;
}

export interface TaxBreakDown {
  subTotal: number;
  discount?: Discount;
  pst: number;
  gst: number;
  total: number;
}

export interface Order {
  id?: string;
  staff: string;
  orderType: OrderType;
  orderItems: OrderItem[];
  taxBreakDown: TaxBreakDown;
  status: OrderStatus;
  printed: boolean;
  createdAt: Timestamp;
}

export interface DineInOrder extends Order {
  orderType: OrderType.DineIn;
  tableNumber: string;
  guests: number;
}

