export interface User {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'cashier' | 'waiter';
  email: string;
  phone?: string;
  address?: string;
  empNo?: string;
  idNumber?: string;
  username?: string;
  password?: string;
  joinedDate?: string;
  branchIds: string[]; // Multiple branches
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  sku: string;
  image?: string;
  createdAt: string;
  expiryDate?: string;
  isPaused?: boolean;
  branchId: string;
  tags?: OrderTag[];
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface OrderTag {
  id: string;
  name: string;
  price: number;
  isTaxFree?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  appliedTags: OrderTag[];
  status: 'new' | 'submitted' | 'void' | 'gift';
}

export interface WorkPeriod {
  id: string;
  startTime: string;
  endTime?: string;
  status: 'open' | 'closed';
  userIdStart: string;
  userIdEnd?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  baseUnit: string;
  transactionUnit?: string;
  multiplier: number;
  cost: number;
  stock: number;
  branchId: string;
}

export interface Recipe {
  id: string;
  productId: string;
  inventoryItemId: string;
  quantity: number;
}

export interface Account {
  id: string;
  branch_id: string;
  name: string;
  type: 'cash' | 'card' | 'wallet' | 'bank' | 'sales' | 'receivable' | 'discount' | 'payment' | 'expense' | 'supplier';
  balance: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  tags?: OrderTag[];
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  receiptTemplate?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyaltyPoints: number;
}

export interface AccountTransaction {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  description: string;
  createdAt: any; // Firestore Timestamp
}

export interface Sale {
  id: string;
  orderNumber: string;
  branch_id: string;
  items: SaleItem[];
  total: number;
  subtotal: number;
  tax: number;
  serviceCharge?: number;
  paymentMethod: string;
  timestamp: any; // Firestore Timestamp
  status?: 'completed' | 'void';
}

export interface CryptoWallet {
  id: string;
  name: string;
  network: 'ERC-20' | 'TRC-20' | 'Binance' | 'Other';
  address: string;
  qrCodeUrl?: string;
}

export interface Settings {
  company_name?: string;
  tax_percentage?: number;
  service_charge?: number;
  btc_address?: string;
  eth_address?: string;
  usdt_erc20_address?: string;
  usdt_trc20_address?: string;
  default_bill_printer_id?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
  branchId: string;
}
