import React from 'react';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  Plus,
  Sun,
} from 'lucide-react';
import { NavTab, TransactionType } from '../types/finance';
import { useFinance } from '../store/financeStore';
import { getMonthLabel, shiftMonthKey } from '../utils/formatters';

interface TopBarProps {
  onOpenMobileMenu: () => void;
  onOpenTransactionModal: (type: TransactionType) => void;
}

const TAB_TITLES: Record<NavTab, string> = {
  dashboard: 'Financial Overview',
  income: 'Income Management',
  expenses: 'Expense Tracker',
  transactions: 'Transaction History',
  savings: 'Monthly Savings Tracker',
  budgets: 'Budget Management',
  analytics: 'Spending Analytics',
  recurring: 'Recurring Payments',
  goals: 'Financial Goals',
  reports: 'Reports & Exports',
  notifications: 'Notifications Center',
  settings: 'Settings & Account',
};

export const TopBar: React.FC<TopBarProps> = ({
  onOpenMobileMenu,
  onOpenTransactionModal,
}) => {
  const {
    activeTab,
    setActiveTab,
    selectedMonth,
    setSelectedMonth,
    vault,
    toggleTheme,
    unreadNotificationCount,
    logout,
  } = useFinance();

  const isDark = vault.settings.theme === 'dark';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8 dark:border-slate-800/90 dark:bg-[#0D1425]/90">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="font-display truncate text-base font-semibold text-slate-900 sm:text-lg dark:text-white">
            {TAB_TITLES[activeTab]}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Month Context Switcher */}
        <div className="hidden sm:flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-[#111A2E]">
          <button
            type="button"
            onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, -1))}
            aria-label="Previous month"
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[84px] px-2 text-center text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
            {getMonthLabel(selectedMonth)}
          </span>
          <button
            type="button"
            onClick={() => setSelectedMonth(shiftMonthKey(selectedMonth, 1))}
            aria-label="Next month"
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Theme Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications Link */}
        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          aria-label="Open notifications"
          className="relative rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Bell className="h-4 w-4" />
          {unreadNotificationCount > 0 && (
            <span className="font-mono-num absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-slate-950">
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </span>
          )}
        </button>

        {/* Quick Actions */}
        <button
          type="button"
          onClick={() => onOpenTransactionModal('income')}
          className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400 whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Income
        </button>

        <button
          type="button"
          onClick={() => onOpenTransactionModal('expense')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add Expense</span>
          <span className="sm:hidden">Add</span>
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={logout}
          title="Log Out"
          aria-label="Log Out"
          className="rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-rose-500/10 hover:text-rose-500 dark:border-slate-800 dark:text-slate-300"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
