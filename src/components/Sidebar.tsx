import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarClock,
  FileBarChart2,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  PiggyBank,
  Settings,
  ShieldCheck,
  Target,
  Wallet,
  X,
} from 'lucide-react';
import { NavTab } from '../types/finance';
import { useFinance } from '../store/financeStore';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_GROUPS: {
  label: string;
  items: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'transactions', label: 'Transactions', icon: ListOrdered },
    ],
  },
  {
    label: 'Money Flow',
    items: [
      { id: 'income', label: 'Income', icon: ArrowDownLeft },
      { id: 'expenses', label: 'Expenses', icon: ArrowUpRight },
      { id: 'recurring', label: 'Recurring', icon: CalendarClock },
    ],
  },
  {
    label: 'Planning & Insights',
    items: [
      { id: 'budgets', label: 'Budgets', icon: ShieldCheck },
      { id: 'savings', label: 'Savings', icon: PiggyBank },
      { id: 'goals', label: 'Financial Goals', icon: Target },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'reports', label: 'Reports', icon: FileBarChart2 },
    ],
  },
  {
    label: 'Preferences',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const {
    activeTab,
    setActiveTab,
    unreadNotificationCount,
    vault,
    logout,
  } = useFinance();

  const handleSelect = (tab: NavTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  const content = (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white dark:border-slate-800/90 dark:bg-[#0D1425]">
      {/* Brand */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800/90">
        <button
          type="button"
          onClick={() => handleSelect('dashboard')}
          className="flex items-center gap-2.5 text-left"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-xs">
            <Wallet className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            FinTrack
          </span>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="mb-1.5 px-3 text-xs font-medium text-slate-400 dark:text-slate-500">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.id === 'notifications' && unreadNotificationCount > 0 && (
                      <span className="font-mono-num text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {unreadNotificationCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Authenticated Account Footer + Logout */}
      <div className="border-t border-slate-200 p-3.5 dark:border-slate-800/90">
        <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-[#111A2E]">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {vault.profile.name || 'Account'}
            </div>
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
              {vault.profile.email}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-72 max-w-[85vw]">{content}</aside>
        </div>
      )}
    </>
  );
};
