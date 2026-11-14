export type TransactionType = 'income' | 'expense';

export type PaymentMethod =
  | 'Cash'
  | 'UPI'
  | 'Debit Card'
  | 'Credit Card'
  | 'Bank Transfer'
  | 'Other';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Bank Transfer',
  'Debit Card',
  'Credit Card',
  'Cash',
  'Other',
];

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelancing',
  'Business',
  'Interest',
  'Investments',
  'Gifts',
  'Other',
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Shopping',
  'Transportation',
  'Fuel',
  'Rent',
  'Electricity',
  'Internet & Mobile',
  'Healthcare',
  'Education',
  'Entertainment',
  'Travel',
  'Subscriptions',
  'Personal Care',
  'Other',
] as const;

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  name: string;
  category: string;
  date: string; // YYYY-MM-DD local date
  paymentMethod: PaymentMethod;
  notes: string;
  receiptDataUrl?: string;
  receiptName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetConfig {
  overallMonthlyBudget: number;
  categoryBudgets: Record<string, number>;
  customExpenseCategories: string[];
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  createdAt: string;
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurringPayment {
  id: string;
  userId: string;
  name: string;
  amount: number;
  category: string;
  frequency: RecurringFrequency;
  nextPaymentDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  active: boolean;
  createdAt: string;
}

export type NotificationSeverity = 'info' | 'warning' | 'high' | 'critical' | 'success';
export type NotificationCategory = 'budget' | 'savings' | 'recurring' | 'goal';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  category: NotificationCategory;
  dedupeKey: string;
  createdAt: string;
  read: boolean;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  currency: 'INR';
  dateFormat: 'DD/MM/YYYY';
  monthlySavingsTarget: number;
  defaultMonthlyBudget: number;
  notifyBudgetThresholds: boolean;
  notifyRecurringUpcoming: boolean;
  notifySavingsBelowTarget: boolean;
  notifyGoalCompleted: boolean;
  requireAuthOnLoad: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  recoveryCodeHash: string;
  createdAt: string;
}

export type NavTab =
  | 'dashboard'
  | 'income'
  | 'expenses'
  | 'transactions'
  | 'savings'
  | 'budgets'
  | 'analytics'
  | 'recurring'
  | 'goals'
  | 'reports'
  | 'notifications'
  | 'settings';
