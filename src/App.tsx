/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { FinanceProvider, useFinance } from './store/financeStore';
import { Transaction, TransactionType } from './types/finance';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { TransactionModal } from './components/TransactionModal';
import { DashboardView } from './components/DashboardView';
import { IncomeView } from './components/IncomeView';
import { ExpensesView } from './components/ExpensesView';
import { TransactionsView } from './components/TransactionsView';
import { SavingsView } from './components/SavingsView';
import { BudgetsView } from './components/BudgetsView';
import { AnalyticsView } from './components/AnalyticsView';
import { RecurringView } from './components/RecurringView';
import { GoalsView } from './components/GoalsView';
import { ReportsView } from './components/ReportsView';
import { NotificationsView } from './components/NotificationsView';
import { SettingsView } from './components/SettingsView';
import { AuthScreen } from './components/AuthScreen';

const FinTrackShell: React.FC = () => {
  const { activeTab, session } = useFinance();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('expense');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Keep browser URL synced with protected routes vs auth routes
  useEffect(() => {
    if (!session.isAuthenticated) {
      if (
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/register' &&
        window.location.pathname !== '/recover'
      ) {
        window.history.replaceState(null, '', '/login');
      }
      return;
    }

    const protectedPath = `/${activeTab}`;
    if (window.location.pathname !== protectedPath) {
      window.history.replaceState(null, '', protectedPath);
    }
  }, [session.isAuthenticated, activeTab]);

  // Strict auth gate: unauthenticated users never receive or render financial views
  if (!session.isAuthenticated || !session.userId) {
    return <AuthScreen />;
  }

  const openAddTransaction = (type: TransactionType) => {
    setEditingTx(null);
    setTxModalType(type);
    setTxModalOpen(true);
  };

  const openEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setTxModalType(tx.type);
    setTxModalOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-[#080D1A] dark:text-slate-100">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenTransactionModal={openAddTransaction}
        />

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {activeTab === 'dashboard' && (
            <DashboardView onOpenTransactionModal={openAddTransaction} />
          )}
          {activeTab === 'income' && (
            <IncomeView
              onAddIncome={() => openAddTransaction('income')}
              onEditTransaction={openEditTransaction}
            />
          )}
          {activeTab === 'expenses' && (
            <ExpensesView
              onAddExpense={() => openAddTransaction('expense')}
              onEditTransaction={openEditTransaction}
            />
          )}
          {activeTab === 'transactions' && (
            <TransactionsView
              onAddTransaction={openAddTransaction}
              onEditTransaction={openEditTransaction}
            />
          )}
          {activeTab === 'savings' && <SavingsView />}
          {activeTab === 'budgets' && <BudgetsView />}
          {activeTab === 'analytics' && <AnalyticsView />}
          {activeTab === 'recurring' && <RecurringView />}
          {activeTab === 'goals' && <GoalsView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'notifications' && <NotificationsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      <TransactionModal
        open={txModalOpen}
        initialType={txModalType}
        editingTransaction={editingTx}
        onClose={() => {
          setTxModalOpen(false);
          setEditingTx(null);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <FinTrackShell />
    </FinanceProvider>
  );
}
