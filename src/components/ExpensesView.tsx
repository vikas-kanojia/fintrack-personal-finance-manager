import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Edit2,
  FileText,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { PAYMENT_METHODS, Transaction } from '../types/finance';
import { useFinance } from '../store/financeStore';
import { formatDateDDMMYYYY, formatINR, getMonthKey, getMonthLabel } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

interface ExpensesViewProps {
  onAddExpense: () => void;
  onEditTransaction: (tx: Transaction) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  onAddExpense,
  onEditTransaction,
}) => {
  const { vault, selectedMonth, allExpenseCategories, deleteTransaction } = useFinance();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<Transaction | null>(null);

  const allExpenses = useMemo(
    () => vault.transactions.filter((t) => t.type === 'expense'),
    [vault.transactions]
  );

  const selectedMonthExpenseTotal = useMemo(
    () =>
      allExpenses
        .filter((t) => getMonthKey(t.date) === selectedMonth)
        .reduce((sum, t) => sum + t.amount, 0),
    [allExpenses, selectedMonth]
  );

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = allExpenses.filter((t) => {
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
      if (paymentFilter !== 'All' && t.paymentMethod !== paymentFilter) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      if (
        q &&
        !t.name.toLowerCase().includes(q) &&
        !t.category.toLowerCase().includes(q) &&
        !(t.notes || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    if (sortBy === 'highest') return [...list].sort((a, b) => b.amount - a.amount);
    if (sortBy === 'lowest') return [...list].sort((a, b) => a.amount - b.amount);
    return [...list].sort((a, b) =>
      b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
    );
  }, [allExpenses, categoryFilter, paymentFilter, dateFrom, dateTo, search, sortBy]);

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((sum, t) => sum + t.amount, 0),
    [filteredExpenses]
  );

  return (
    <div className="space-y-6">
      {/* Top Summary & CTA */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {getMonthLabel(selectedMonth)} Spending
          </div>
          <div className="font-mono-num mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatINR(selectedMonthExpenseTotal)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Total expenses for selected month
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Selected Period Total
          </div>
          <div className="font-mono-num mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatINR(filteredTotal)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {filteredExpenses.length} expense record{filteredExpenses.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]">
          <div>
            <div className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Log New Expense
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Track bills, groceries, travel, or UPI spends
            </p>
          </div>
          <button
            type="button"
            onClick={onAddExpense}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expense or description..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
          >
            <option value="All">All Categories</option>
            {allExpenseCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
          >
            <option value="All">All Payment Methods</option>
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'highest' | 'lowest')}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
          >
            <option value="newest">Sort: Newest</option>
            <option value="highest">Sort: Highest Amount</option>
            <option value="lowest">Sort: Lowest Amount</option>
          </select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="From date"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="To date"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
            />
          </div>
        </div>

        {(search || categoryFilter !== 'All' || paymentFilter !== 'All' || dateFrom || dateTo) && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategoryFilter('All');
                setPaymentFilter('All');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Clear all filters
            </button>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          {filteredExpenses.length > 0 ? (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Expense Name</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Payment Method</th>
                  <th className="pb-3 pr-4">Receipt</th>
                  <th className="pb-3 pr-4 text-right">Amount</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredExpenses.map((tx) => (
                  <tr
                    key={tx.id}
                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                  >
                    <td className="font-mono-num py-3 pr-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDateDDMMYYYY(tx.date)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {tx.name}
                      </div>
                      {tx.notes && (
                        <div className="mt-0.5 max-w-xs truncate text-xs text-slate-500 dark:text-slate-400">
                          {tx.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-600 dark:text-slate-300">
                      {tx.category}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-600 dark:text-slate-300">
                      {tx.paymentMethod}
                    </td>
                    <td className="py-3 pr-4">
                      {tx.receiptDataUrl ? (
                        <button
                          type="button"
                          onClick={() => setReceiptPreview(tx)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="font-mono-num py-3 pr-4 text-right font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      -{formatINR(tx.amount)}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onEditTransaction(tx)}
                        aria-label={`Edit ${tx.name}`}
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(tx)}
                        aria-label={`Delete ${tx.name}`}
                        className="ml-1 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-500 dark:text-slate-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-white">
                {allExpenses.length === 0 ? 'No expenses recorded yet' : 'No matching expenses'}
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                {allExpenses.length === 0
                  ? 'Start logging daily expenses to monitor category budgets and spending habits.'
                  : 'Try adjusting your search or filter selections.'}
              </p>
              {allExpenses.length === 0 && (
                <button
                  type="button"
                  onClick={onAddExpense}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  <Plus className="h-4 w-4" />
                  Add First Expense
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {receiptPreview && receiptPreview.receiptDataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#111A2E]">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                  Receipt · {receiptPreview.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {receiptPreview.receiptName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptPreview(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 max-h-[65vh] overflow-auto rounded-xl bg-slate-100 p-2 dark:bg-[#0B1221]">
              {receiptPreview.receiptDataUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={receiptPreview.receiptDataUrl}
                  title="Receipt PDF"
                  className="h-[55vh] w-full rounded-lg"
                />
              ) : (
                <img
                  src={receiptPreview.receiptDataUrl}
                  alt={receiptPreview.receiptName || 'Receipt'}
                  className="mx-auto max-h-[58vh] rounded-lg object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Expense"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}" (${formatINR(deleteTarget.amount)})? Budget usage and balances will recalculate automatically.`
            : ''
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteTransaction(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};
