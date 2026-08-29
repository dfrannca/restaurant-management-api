export enum TableStatus {
  Free = 0,
  Occupied = 1,
  ClosingBill = 2
}

export enum PaymentMethod {
  Cash = 0,
  Pix = 1,
  DebitCard = 2,
  CreditCard = 3
}

export enum UserRole {
  Cashier = 0,
  Administrator = 1
}

export enum OrderStatus {
  InProgress = 0,
  OnTable = 1
}

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  email?: string;
  createdAt: string;
  isActive: boolean;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  category?: Category;
  imageUrl?: string;
  isActive: boolean;
}

export interface Table {
  id: number;
  number: number;
  status: TableStatus;
  capacity: number;
  location?: string;
  currentTotal?: number;
  openedAt?: string;
  customerName?: string;
}

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  observations?: string;
}

export interface Order {
  id: number;
  tableId: number;
  tableNumber: number;
  customerName?: string;
  observations?: string;
  openedAt: string;
  closedAt?: string;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  isClosed: boolean;
  status: OrderStatus;
  userName?: string;
  orderItems: OrderItem[];
}

export interface CashRegister {
  id: number;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  closingBalance: number;
  isOpen: boolean;
  userName: string;
}

export interface CashClosing {
  id: number;
  cashRegisterId: number;
  closingDate: string;
  totalSold: number;
  totalOrders: number;
  totalPix: number;
  totalCash: number;
  totalDebit: number;
  totalCredit: number;
  averageTicket: number;
  cashRegisterOpenedAt: string;
  cashRegisterClosedAt: string;
  userName: string;
  openingBalance: number;
  closingBalance: number;
  closedOrders?: Order[];
}
