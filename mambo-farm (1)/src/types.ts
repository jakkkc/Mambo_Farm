export type UserRole = 'admin' | 'standard';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  createdAt: string;
}

export type PoultryType = 'Layers' | 'Broilers' | 'Kienyeji';
export type PoultryStatus = 'Active' | 'Sold' | 'Deceased';

export interface PoultryBatch {
  id: string;
  type: PoultryType;
  count: number;
  arrivalDate: string;
  status: PoultryStatus;
  lastUpdate: string;
}

export type BeehiveType = 'Langstroth' | 'KTBH' | 'Traditional';
export type BeehiveStatus = 'Active' | 'Empty' | 'Harvest Ready';

export interface Beehive {
  id: string;
  location: string;
  type: BeehiveType;
  status: BeehiveStatus;
  lastInspection: string;
}

export type SaleCategory = 'Poultry' | 'Honey' | 'Eggs' | 'Other';

export interface Sale {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  totalPrice: number;
  date: string;
  category: SaleCategory;
  recordedBy: string;
}

export type ExpenseCategory = 'Feed' | 'Medicine' | 'Equipment' | 'Labor' | 'Other';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  recordedBy: string;
}

export type NotificationType = 'info' | 'warning' | 'task';
export type NotificationStatus = 'unread' | 'read';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  status: NotificationStatus;
  createdAt: string;
  dueDate?: string;
}
