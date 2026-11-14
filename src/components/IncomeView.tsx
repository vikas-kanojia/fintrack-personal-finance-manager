import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  Calendar,
  Edit2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { INCOME_CATEGORIES, Transaction } from '../types/finance';
import { useFinance } from '../store/financeStore';
import { formatDateDDMMYYYY, formatINR, getMonthKey, getMonthLabel } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

interface IncomeViewProps {
  onAddIncome: () => void;
  onEditTransaction: (tx: Transaction) => void;
}

export const IncomeView: React.FC<IncomeViewProps> = ({
  onAddIncome,
  onEditTransaction,
}) => {
  const { vault, selectedMonth, deleteTransaction } = useFinance();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const allIncomes = useMemo(
    () => vault.transactions.filter((t) => t.type === 'income'),
    [vault.transactions]
  );

  const selectedMonthIncomeTotal = useMemo(
    () =>
      allIncomes
        .filter((t) => getMonthKey(t.date) === selectedMonth)
        .reduce((sum, t) => sum + t.amount, 0),
    [allIncomes, selectedMonth]
  );

  const filteredIncomes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allIncomes.filter((t) => {
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
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
  }, [allIncomes, categoryFilter, dateFrom, dateTo, search]);

  const filteredTotal = useMemo(
    () => filteredIncomes.reduce((sum, t) => sum + t.amount, 0),
    [filteredIncomes]
  );

  const monthlyBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of allIncomes) {
      const mk = getMonthKey(tx.date);
      map.set(mk, (map.get(mk) ?? 0) + tx.amount);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6);
  }, [allIncomes]);

  return (
    <div className="space-y-6">
      {/* Top Summary & CTA */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {getMonthLabel(selectedMonth)} Income
          </div>
          <div className="font-mono-num mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatINR(selectedMonthIncomeTotal)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Total recorded for selected month
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Filtered Period Total
          </div>
          <div className="font-mono-num mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatINR(filteredTotal)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {filteredIncomes.length} income record{filteredIncomes.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]">
          <div>
            <div className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Record New Income
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Salary, freelancing, interest, or gifts
            </p>
          </div>
          <button
            type="button"
            onClick={onAddIncome}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Income
          </button>
        </div>
      </div>

      {/* Total Income by Month Strip */}
      {monthlyBreakdown.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-500" />
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Total Income by Month
            </h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {monthlyBreakdown.map(([mk, amt]) => (
              <div
                key={mk}
                className="border-t border-slate-100 pt-2.5 dark:border-slate-800/80"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {getMonthLabel(mk)}
                </div>
                <div className="font-mono-num mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatINR(amt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search income source or notes..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
          >
            <option value="All">All Income Categories</option>
            {INCOME_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Filter from date"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
          />

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Filter to date"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
            />
            {(search || categoryFilter !== 'All' || dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('All');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          {filteredIncomes.length > 0 ? (
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Income Source</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Payment Method</th>
                  <th className="pb-3 pr-4 text-right">Amount</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredIncomes.map((tx) => (
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
                    <td className="font-mono-num py-3 pr-4 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      +{formatINR(tx.amount)}
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
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-white">
                {allIncomes.length === 0 ? 'No income recorded yet' : 'No matching income entries'}
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                {allIncomes.length === 0
                  ? 'Add salary, freelance earnings, dividends, or gifts to track your cash inflows.'
                  : 'Try adjusting your search query or date filters.'}
              </p>
              {allIncomes.length === 0 && (
                <button
                  type="button"
                  onClick={onAddIncome}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  <Plus className="h-4 w-4" />
                  Add First Income
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Income Entry"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}" (${formatINR(deleteTarget.amount)})? This will update all balances and charts.`
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
