import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AppNotification,
  BudgetConfig,
  DEFAULT_EXPENSE_CATEGORIES,
  NavTab,
  RecurringPayment,
  SavingsGoal,
  Transaction,
  UserAccount,
  UserSettings,
} from '../types/finance';
import { evaluateNewNotifications } from '../utils/calculations';
import {
  advanceRecurringDate,
  getCurrentMonthKey,
  getTodayISO,
  hashSecret,
  roundCurrency,
} from '../utils/formatters';

interface VaultData {
  transactions: Transaction[];
  budgets: BudgetConfig;
  goals: SavingsGoal[];
  recurring: RecurringPayment[];
  notifications: AppNotification[];
  settings: UserSettings;
  profile: {
    name: string;
    email: string;
  };
}

const ACCOUNTS_KEY = 'fintrack_accounts_v1';
const SESSION_KEY = 'fintrack_session_v1';
const THEME_KEY = 'fintrack_theme_v1';
const vaultKey = (userId: string) => `fintrack_vault_v1_${userId}`;

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
  monthlySavingsTarget: 0,
  defaultMonthlyBudget: 0,
  notifyBudgetThresholds: true,
  notifyRecurringUpcoming: true,
  notifySavingsBelowTarget: true,
  notifyGoalCompleted: true,
  requireAuthOnLoad: true,
};

const DEFAULT_BUDGETS: BudgetConfig = {
  overallMonthlyBudget: 0,
  categoryBudgets: {},
  customExpenseCategories: [],
};

function getSavedTheme(): 'dark' | 'light' {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function createEmptyVault(name = '', email = ''): VaultData {
  return {
    transactions: [],
    budgets: { ...DEFAULT_BUDGETS, categoryBudgets: {}, customExpenseCategories: [] },
    goals: [],
    recurring: [],
    notifications: [],
    settings: { ...DEFAULT_SETTINGS, theme: getSavedTheme() },
    profile: { name, email },
  };
}

function readAccounts(): UserAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as UserAccount[]) : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: UserAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function readVault(userId: string, fallbackName = '', fallbackEmail = ''): VaultData {
  try {
    const raw = localStorage.getItem(vaultKey(userId));
    if (!raw) return createEmptyVault(fallbackName, fallbackEmail);
    const parsed = JSON.parse(raw) as Partial<VaultData>;
    return {
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      budgets: {
        overallMonthlyBudget: parsed.budgets?.overallMonthlyBudget ?? 0,
        categoryBudgets: parsed.budgets?.categoryBudgets ?? {},
        customExpenseCategories: parsed.budgets?.customExpenseCategories ?? [],
      },
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      recurring: Array.isArray(parsed.recurring) ? parsed.recurring : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      profile: {
        name: parsed.profile?.name ?? fallbackName,
        email: parsed.profile?.email ?? fallbackEmail,
      },
    };
  } catch {
    return createEmptyVault(fallbackName, fallbackEmail);
  }
}

function writeVault(userId: string, data: VaultData) {
  localStorage.setItem(vaultKey(userId), JSON.stringify(data));
}

export interface SessionState {
  userId: string | null;
  isAuthenticated: boolean;
}

function readInitialSession(): SessionState {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { userId: null, isAuthenticated: false };
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    if (!parsed.isAuthenticated || !parsed.userId) {
      return { userId: null, isAuthenticated: false };
    }
    const accounts = readAccounts();
    const accountExists = accounts.some((a) => a.id === parsed.userId);
    if (!accountExists) {
      localStorage.removeItem(SESSION_KEY);
      return { userId: null, isAuthenticated: false };
    }
    return { userId: parsed.userId, isAuthenticated: true };
  } catch {
    return { userId: null, isAuthenticated: false };
  }
}

export interface FinanceContextValue {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedMonth: string;
  setSelectedMonth: (monthKey: string) => void;

  session: SessionState;
  vault: VaultData;
  allExpenseCategories: string[];
  unreadNotificationCount: number;

  // Transaction CRUD
  addTransaction: (
    tx: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => Transaction | null;
  updateTransaction: (
    id: string,
    patch: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>
  ) => void;
  deleteTransaction: (id: string) => void;

  // Budget CRUD
  updateOverallBudget: (amount: number) => void;
  setCategoryBudget: (category: string, amount: number) => void;
  removeCategoryBudget: (category: string) => void;
  addCustomExpenseCategory: (category: string) => void;

  // Goals CRUD
  addGoal: (goal: Omit<SavingsGoal, 'id' | 'userId' | 'createdAt'>) => void;
  updateGoal: (id: string, patch: Partial<Omit<SavingsGoal, 'id' | 'userId' | 'createdAt'>>) => void;
  contributeGoal: (id: string, amount: number) => void;
  deleteGoal: (id: string) => void;

  // Recurring CRUD
  addRecurring: (rec: Omit<RecurringPayment, 'id' | 'userId' | 'createdAt'>) => void;
  updateRecurring: (
    id: string,
    patch: Partial<Omit<RecurringPayment, 'id' | 'userId' | 'createdAt'>>
  ) => void;
  deleteRecurring: (id: string) => void;
  recordRecurringAsExpense: (id: string) => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  clearReadNotifications: () => void;

  // Settings & Profile
  updateSettings: (patch: Partial<UserSettings>) => void;
  updateProfile: (profile: { name: string; email: string }) => void;
  toggleTheme: () => void;
  exportAllDataJSON: () => void;
  deleteAllUserData: () => void;

  // Auth
  hasRegisteredAccounts: boolean;
  registerAccount: (params: {
    name: string;
    email: string;
    password: string;
  }) => Promise<
    { ok: true; recoveryCode: string; userId: string } | { ok: false; error: string }
  >;
  completeRegistration: (userId: string) => void;
  loginAccount: (params: {
    email: string;
    password: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  recoverPassword: (params: {
    email: string;
    recoveryCode: string;
    newPassword: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  changePassword: (params: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<SessionState>(readInitialSession);
  const [vault, setVault] = useState<VaultData>(() => {
    const initial = readInitialSession();
    if (!initial.isAuthenticated || !initial.userId) {
      return createEmptyVault();
    }
    const account = readAccounts().find((a) => a.id === initial.userId);
    return readVault(initial.userId, account?.name ?? '', account?.email ?? '');
  });
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey);
  const [accountsVersion, setAccountsVersion] = useState(0);

  const hasRegisteredAccounts = useMemo(() => {
    void accountsVersion;
    return readAccounts().length > 0;
  }, [accountsVersion]);

  // Sync theme on <html>
  useEffect(() => {
    const isDark = vault.settings.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem(THEME_KEY, vault.settings.theme);
    } catch {
      // ignore storage errors
    }
  }, [vault.settings.theme]);

  // Persist session strictly when authenticated
  useEffect(() => {
    if (session.isAuthenticated && session.userId) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [session]);

  // Persist vault + evaluate notifications (only for authenticated user)
  const persistAndEvaluate = useCallback(
    (updater: (prev: VaultData) => VaultData, userIdOverride?: string) => {
      const targetUserId = userIdOverride ?? session.userId;
      if (!targetUserId) return;
      setVault((prev) => {
        const next = updater(prev);
        const monthToCheck = getCurrentMonthKey();
        const newNotifs = evaluateNewNotifications(
          targetUserId,
          next.notifications,
          next.transactions,
          next.budgets,
          next.goals,
          next.recurring,
          next.settings,
          monthToCheck
        );
        const finalVault: VaultData =
          newNotifs.length > 0
            ? { ...next, notifications: [...newNotifs, ...next.notifications].slice(0, 150) }
            : next;
        writeVault(targetUserId, finalVault);
        return finalVault;
      });
    },
    [session.userId]
  );

  // Evaluate alerts when authenticated user logs in or switches
  useEffect(() => {
    if (!session.isAuthenticated || !session.userId) return;
    persistAndEvaluate((prev) => prev, session.userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.userId, session.isAuthenticated]);

  const allExpenseCategories = useMemo(() => {
    const set = new Set<string>([
      ...DEFAULT_EXPENSE_CATEGORIES,
      ...vault.budgets.customExpenseCategories,
      ...Object.keys(vault.budgets.categoryBudgets),
    ]);
    return Array.from(set);
  }, [vault.budgets.customExpenseCategories, vault.budgets.categoryBudgets]);

  const unreadNotificationCount = useMemo(
    () => vault.notifications.filter((n) => !n.read).length,
    [vault.notifications]
  );

  const addTransaction = useCallback(
    (tx: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      if (!session.isAuthenticated || !session.userId) return null;
      const now = new Date().toISOString();
      const created: Transaction = {
        ...tx,
        amount: roundCurrency(tx.amount),
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId: session.userId,
        createdAt: now,
        updatedAt: now,
      };
      persistAndEvaluate((prev) => ({
        ...prev,
        transactions: [created, ...prev.transactions].sort((a, b) =>
          b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
        ),
      }));
      return created;
    },
    [persistAndEvaluate, session.isAuthenticated, session.userId]
  );

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>) => {
      if (!session.isAuthenticated) return;
      const now = new Date().toISOString();
      persistAndEvaluate((prev) => ({
        ...prev,
        transactions: prev.transactions
          .map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...patch,
                  amount: patch.amount !== undefined ? roundCurrency(patch.amount) : t.amount,
                  updatedAt: now,
                }
              : t
          )
          .sort((a, b) =>
            b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
          ),
      }));
    },
    [persistAndEvaluate, session.isAuthenticated]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      if (!session.isAuthenticated) return;
      persistAndEvaluate((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== id),
      }));
    },
    [persistAndEvaluate, session.isAuthenticated]
  );

  const updateOverallBudget = useCallback(
    (amount: number) => {
      if (!session.isAuthenticated) return;
      persistAndEvaluate((prev) => ({
        ...prev,
        budgets: {
          ...prev.budgets,
          overallMonthlyBudget: Math.max(0, roundCurrency(amount)),
        },
      }));
    },
    [persistAndEvaluate, session.isAuthenticated]
  );

  const setCategoryBudget = useCallback(
    (category: string, amount: number) => {
      if (!session.isAuthenticated) return;
      const clean = Math.max(0, roundCurrency(amount));
      persistAndEvaluate((prev) => {
        const nextMap = { ...prev.budgets.categoryBudgets };
        if (clean <= 0) {
          delete nextMap[category];
        } else {
          nextMap[category] = clean;
        }
        return {
          ...prev,
          budgets: {
            ...prev.budgets,
            categoryBudgets: nextMap,
          },
        };
      });
    },
    [persistAndEvaluate, session.isAuthenticated]
  );

  const removeCategoryBudget = useCallback(
    (category: string) => {
      if (!session.isAuthenticated) return;
      persistAndEvaluate((prev) => {
        const nextMap = { ...prev.budgets.categoryBudgets };
        delete nextMap[category];
        return {
          ...prev,
          budgets: {
            ...prev.budgets,
            categoryBudgets: nextMap,
          },
        };
      });
    },
    [persistAndEvaluate, session.isAuthenticated]
  );

  const addCustomExpenseCategory = useCallback(
    (category: string) => {
      if (!session.isAuthenticated) return;
      const trimmed = category.trim();
      if (!trimmed) return;
      persistAndEvaluate((prev) => {
        if (
          DEFAULT_EXPENSE_CATEGORIES.includes(trimmed as any) ||
          prev.budgets.customExpenseCategories.includes(trimmed)
        ) {
          return prev;
        }
        return {
          ...prev,
          budgets: {
            ...prev.budgets,
            customExpenseCategories: [...prev.budgets.customExpenseCategories, trimmed],
          },
        };
      });
    },
    [persistAndEvaluate, session.isAuthenticated]
  );

  const addGoal = useCallback(
    (goal: Omit<SavingsGoal, 'id' | 'userId' | 'createdAt'>) => {
      if (!session.isAuthenticated || !session.userId) return;
      const created: SavingsGoal = {
        ...goal,
        targetAmount: roundCurrency(goal.targetAmount),
        currentAmount: roundCurrency(goal.currentAmount),
        id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: session.userId,
        createdAt: new Date().toISOString(),
      };
      persistAndEvaluate((prev) => ({
        ...prev,
        goals: [created, ...prev.goals],
      }));
    },
    [persistAndEvaluate, session.isAuthenticated, session.userId]
  );

  const updateGoal = useCallback(
    (id: string, patch: Partial<Omit<SavingsGoal, 'id' | 'userId' | 'createdAt'>>) => {
      if (!session.isAuthenticated) return;
      persistAndEvaluate((prev) => ({
        ...prev,
        goals: prev.goals.map((g) =>
          g.id === id
            ? {
                ...g,
                ...patch,
                targetAmount:
                  patch.targetAmount !== undefined
                    ? roundCurrency(patch.targetAmount)
                    : g.targetAmount,
                currentAmount:
                  patch.currentAmount !== undefined
                    ? roundCurrency(patch.currentAmount)
                    : g.currentAmount,
              }
            : g
        ),
      }));
    },
    [persistAndEvaluate, session.isAuthenticated]
  );

  const contributeGoal = useCallback(
    (id: string, amount: number) => {
      if (!session.isAuthenticated) return;
      const delta = roundCurrency(amount);
      if (delta <= 0) return;
      persistAndEvaluate((prev) => ({
        ...prev,
        goals: prev.goals.map((g) =>
          g.id === id ? { ...g, currentAmount: roundCurrency(g.currentAmount + delta) } : g
        ),
      }));
    },
    [persistAndEvaluate, session.isAuthenticated]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      if (!session.isAuthenticated) return;
      persistAndEvaluate((prev) => ({
        ...prev,
        goals: prev.goals.filter((g) => g.id !== id),
      }));
    },
    [persistAndEvaluate, session.isAuthenticated]
  );

  const addRecurring = useCallback(
    (rec: Omit<RecurringPayment, 'id' | 'userId' | 'createdAt'>) => {
      if (!session.isAuthenticated || !session.userId) return;
      const created: RecurringPayment = {
        ...rec,
        amount: roundCurrency(rec.amount),
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: session.userId,
        createdAt: new Date().toISOString(),
      };
      persistAndEvaluate((prev) => ({
        ...prev,
        recurring: [created, ...prev.recurring].sort((a, b) =>
          a.nextPaymentDate.localeCompare(b.nextPaymentDate)
        ),
      }));
    },
    [persistAndEvaluate, session.isAuthenticated, session.userId]
  );

  const updateRecurring = useCallback(
    (id: string, patch: Partial<Omit<RecurringPayment, 'id' | 'userId' | 'createdAt'>>) => {
      if (!session.isAuthenticated) return;
      persistAndEvaluate((prev) => ({
        ...prev,
        recurring: prev.recurring
          .map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...patch,
                  amount: patch.amount !== undefined ? roundCurrency(patch.amount) : r.amount,
                }
              : r
          )
          .sort((a, b) => a.nextPaymentDate.localeCompare(b.nextPaymentDate)),
      }));
    },
    [persistAndEvaluate, session.isAuthenticated]
  );

  const deleteRecurring = useCallback(
    (id: string) => {
      if (!session.isAuthenticated) return;
      persistAndEvaluate((prev) => ({
        ...prev,
        recurring: prev.recurring.filter((r) => r.id !== id),
      }));
    },
    [persistAndEvaluate, session.isAuthenticated]
  );

  const recordRecurringAsExpense = useCallback(
    (id: string) => {
      if (!session.isAuthenticated || !session.userId) return;
      const uid = session.userId;
      persistAndEvaluate((prev) => {
        const target = prev.recurring.find((r) => r.id === id);
        if (!target) return prev;
        const now = new Date().toISOString();
        const tx: Transaction = {
          id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          userId: uid,
          type: 'expense',
          amount: target.amount,
          name: target.name,
          category: target.category,
          date: getTodayISO(),
          paymentMethod: target.paymentMethod,
          notes: `Logged from ${target.frequency} recurring schedule`,
          createdAt: now,
          updatedAt: now,
        };
        const updatedRecurring = prev.recurring
          .map((r) =>
            r.id === id
              ? { ...r, nextPaymentDate: advanceRecurringDate(r.nextPaymentDate, r.frequency) }
              : r
          )
          .sort((a, b) => a.nextPaymentDate.localeCompare(b.nextPaymentDate));
        return {
          ...prev,
          transactions: [tx, ...prev.transactions].sort((a, b) =>
            b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
          ),
          recurring: updatedRecurring,
        };
      });
    },
    [persistAndEvaluate, session.isAuthenticated, session.userId]
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      if (!session.isAuthenticated) return;
      persistAndEvaluate((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      }));
    },
    [persistAndEvaluate, session.isAuthenticated]
  );

  const markAllNotificationsRead = useCallback(() => {
    if (!session.isAuthenticated) return;
    persistAndEvaluate((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, [persistAndEvaluate, session.isAuthenticated]);

  const deleteNotification = useCallback(
    (id: string) => {
      if (!session.isAuthenticated) return;
      persistAndEvaluate((prev) => ({
        ...prev,
        notifications: prev.notifications.filter((n) => n.id !== id),
      }));
    },
    [persistAndEvaluate, session.isAuthenticated]
  );

  const clearReadNotifications = useCallback(() => {
    if (!session.isAuthenticated) return;
    persistAndEvaluate((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => !n.read),
    }));
  }, [persistAndEvaluate, session.isAuthenticated]);

  const updateSettings = useCallback(
    (patch: Partial<UserSettings>) => {
      if (!session.isAuthenticated) return;
      persistAndEvaluate((prev) => {
        const nextSettings = { ...prev.settings, ...patch };
        let nextBudgets = prev.budgets;
        if (
          patch.defaultMonthlyBudget !== undefined &&
          prev.budgets.overallMonthlyBudget === 0 &&
          patch.defaultMonthlyBudget > 0
        ) {
          nextBudgets = {
            ...prev.budgets,
            overallMonthlyBudget: roundCurrency(patch.defaultMonthlyBudget),
          };
        }
        return {
          ...prev,
          settings: nextSettings,
          budgets: nextBudgets,
        };
      });
    },
    [persistAndEvaluate, session.isAuthenticated]
  );

  const updateProfile = useCallback(
    (profile: { name: string; email: string }) => {
      if (!session.isAuthenticated || !session.userId) return;
      persistAndEvaluate((prev) => ({
        ...prev,
        profile,
      }));
      const accounts = readAccounts().map((a) =>
        a.id === session.userId ? { ...a, name: profile.name, email: profile.email } : a
      );
      writeAccounts(accounts);
    },
    [persistAndEvaluate, session.isAuthenticated, session.userId]
  );

  const toggleTheme = useCallback(() => {
    setVault((prev) => {
      const nextTheme: 'dark' | 'light' = prev.settings.theme === 'dark' ? 'light' : 'dark';
      const updated: VaultData = {
        ...prev,
        settings: { ...prev.settings, theme: nextTheme },
      };
      if (session.isAuthenticated && session.userId) {
        writeVault(session.userId, updated);
      }
      return updated;
    });
  }, [session.isAuthenticated, session.userId]);

  const exportAllDataJSON = useCallback(() => {
    if (!session.isAuthenticated) return;
    const blob = new Blob([JSON.stringify(vault, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fintrack-backup-${getTodayISO()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [session.isAuthenticated, vault]);

  const deleteAllUserData = useCallback(() => {
    if (!session.isAuthenticated || !session.userId) return;
    const uid = session.userId;
    const remaining = readAccounts().filter((a) => a.id !== uid);
    writeAccounts(remaining);
    localStorage.removeItem(vaultKey(uid));
    localStorage.removeItem(SESSION_KEY);
    setAccountsVersion((v) => v + 1);
    setSession({ userId: null, isAuthenticated: false });
    setVault(createEmptyVault());
    setActiveTab('dashboard');
  }, [session.isAuthenticated, session.userId]);

  const registerAccount = useCallback(
    async ({ name, email, password }: { name: string; email: string; password: string }) => {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      if (!cleanName || !cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return { ok: false as const, error: 'Please enter your full name and a valid email address.' };
      }
      if (password.length < 6) {
        return { ok: false as const, error: 'Password must be at least 6 characters long.' };
      }
      const accounts = readAccounts();
      if (accounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
        return { ok: false as const, error: 'An account with this email already exists.' };
      }

      const recoveryCode = `FT-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;
      const newUserId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const passwordHash = await hashSecret(password);
      const recoveryCodeHash = await hashSecret(recoveryCode);

      const account: UserAccount = {
        id: newUserId,
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        recoveryCodeHash,
        createdAt: new Date().toISOString(),
      };
      writeAccounts([...accounts, account]);
      setAccountsVersion((v) => v + 1);

      const initialVault = createEmptyVault(cleanName, cleanEmail);
      writeVault(newUserId, initialVault);

      return { ok: true as const, recoveryCode, userId: newUserId };
    },
    []
  );

  const completeRegistration = useCallback((userId: string) => {
    const account = readAccounts().find((a) => a.id === userId);
    if (!account) return;
    const loadedVault = readVault(account.id, account.name, account.email);
    setVault(loadedVault);
    setSession({ userId: account.id, isAuthenticated: true });
    setActiveTab('dashboard');
  }, []);

  const loginAccount = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const cleanEmail = email.trim().toLowerCase();
      const accounts = readAccounts();
      const found = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
      if (!found) {
        return { ok: false as const, error: 'No account found with that email address.' };
      }
      const hash = await hashSecret(password);
      if (hash !== found.passwordHash) {
        return { ok: false as const, error: 'Incorrect password. Please try again.' };
      }
      const loadedVault = readVault(found.id, found.name, found.email);
      setVault(loadedVault);
      setSession({ userId: found.id, isAuthenticated: true });
      setActiveTab('dashboard');
      return { ok: true as const };
    },
    []
  );

  const recoverPassword = useCallback(
    async ({
      email,
      recoveryCode,
      newPassword,
    }: {
      email: string;
      recoveryCode: string;
      newPassword: string;
    }) => {
      if (newPassword.length < 6) {
        return { ok: false as const, error: 'New password must be at least 6 characters long.' };
      }
      const cleanEmail = email.trim().toLowerCase();
      const accounts = readAccounts();
      const idx = accounts.findIndex((a) => a.email.toLowerCase() === cleanEmail);
      if (idx === -1) {
        return { ok: false as const, error: 'No account found with that email address.' };
      }
      const codeHash = await hashSecret(recoveryCode.trim().toUpperCase());
      if (codeHash !== accounts[idx].recoveryCodeHash) {
        return { ok: false as const, error: 'Invalid recovery code. Please check and try again.' };
      }
      const newHash = await hashSecret(newPassword);
      const updated = [...accounts];
      updated[idx] = { ...updated[idx], passwordHash: newHash };
      writeAccounts(updated);
      return { ok: true as const };
    },
    []
  );

  const changePassword = useCallback(
    async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      if (!session.isAuthenticated || !session.userId) {
        return { ok: false as const, error: 'You must be signed in to change your password.' };
      }
      if (newPassword.length < 6) {
        return { ok: false as const, error: 'New password must be at least 6 characters long.' };
      }
      const accounts = readAccounts();
      const idx = accounts.findIndex((a) => a.id === session.userId);
      if (idx === -1) return { ok: false as const, error: 'Account record not found.' };
      const currHash = await hashSecret(currentPassword);
      if (currHash !== accounts[idx].passwordHash) {
        return { ok: false as const, error: 'Current password is incorrect.' };
      }
      const newHash = await hashSecret(newPassword);
      const updated = [...accounts];
      updated[idx] = { ...updated[idx], passwordHash: newHash };
      writeAccounts(updated);
      return { ok: true as const };
    },
    [session.isAuthenticated, session.userId]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession({ userId: null, isAuthenticated: false });
    setVault(createEmptyVault());
    setActiveTab('dashboard');
  }, []);

  const value: FinanceContextValue = {
    activeTab,
    setActiveTab,
    selectedMonth,
    setSelectedMonth,
    session,
    vault,
    allExpenseCategories,
    unreadNotificationCount,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateOverallBudget,
    setCategoryBudget,
    removeCategoryBudget,
    addCustomExpenseCategory,
    addGoal,
    updateGoal,
    contributeGoal,
    deleteGoal,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    recordRecurringAsExpense,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearReadNotifications,
    updateSettings,
    updateProfile,
    toggleTheme,
    exportAllDataJSON,
    deleteAllUserData,
    hasRegisteredAccounts,
    registerAccount,
    completeRegistration,
    loginAccount,
    recoverPassword,
    changePassword,
    logout,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider');
  return ctx;
}
