import React, { useMemo, useState } from 'react';
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  ListOrdered,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  Transaction,
  TransactionType,
} from '../types/finance';
import { useFinance } from '../store/financeStore';
import { exportTransactionsCSV } from '../utils/calculations';
import { formatDateDDMMYYYY, formatINR } from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

interface TransactionsViewProps {
  onAddTransaction: (type: TransactionType) => void;
  onEditTransaction: (tx: Transaction) => void;
}

const PAGE_SIZE = 12;

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onAddTransaction,
  onEditTransaction,
}) => {
  const { vault, allExpenseCategories, deleteTransaction } = useFinance();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'name'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const allCategories = useMemo(
    () => Array.from(new Set([...INCOME_CATEGORIES, ...allExpenseCategories])),
    [allExpenseCategories]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = vault.transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'All' && tx.category !== categoryFilter) return false;
      if (paymentFilter !== 'All' && tx.paymentMethod !== paymentFilter) return false;
      if (
        q &&
        !tx.name.toLowerCase().includes(q) &&
        !tx.category.toLowerCase().includes(q) &&
        !tx.paymentMethod.toLowerCase().includes(q) &&
        !(tx.notes || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        cmp = a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date);
      } else if (sortField === 'amount') {
        cmp = a.amount - b.amount;
      } else {
        cmp = a.name.localeCompare(b.name);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [vault.transactions, search, typeFilter, categoryFilter, paymentFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (field: 'date' | 'amount' | 'name') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
              {(['all', 'income', 'expense'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTypeFilter(t);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                    typeFilter === t
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111A2E] dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <span className="font-mono-num text-xs text-slate-500 dark:text-slate-400">
              {filtered.length} transaction{filtered.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={filtered.length === 0}
              onClick={() => exportTransactionsCSV(filtered)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => onAddTransaction('expense')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              New Entry
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search transaction name, category, payment method, notes..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
          >
            <option value="All">All Categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
          >
            <option value="All">All Payment Methods</option>
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="mt-5 overflow-x-auto">
          {paginated.length > 0 ? (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-3 pr-4">
                    <button
                      type="button"
                      onClick={() => toggleSort('date')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      Date
                      <ArrowDownUp className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="pb-3 pr-4">
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      Transaction Name
                      <ArrowDownUp className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Payment Method</th>
                  <th className="pb-3 pr-4 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('amount')}
                      className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    >
                      Amount
                      <ArrowDownUp className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginated.map((tx) => (
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
                    <td className="py-3 pr-4 text-xs font-medium">
                      <span
                        className={
                          tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {tx.type === 'income' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-600 dark:text-slate-300">
                      {tx.paymentMethod}
                    </td>
                    <td
                      className={`font-mono-num py-3 pr-4 text-right font-semibold whitespace-nowrap ${
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatINR(tx.amount)}
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
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                <ListOrdered className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-white">
                {vault.transactions.length === 0
                  ? 'No transactions recorded yet'
                  : 'No matching transactions'}
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                {vault.transactions.length === 0
                  ? 'Add your first income or expense to populate the ledger.'
                  : 'Try clearing or modifying your search and filters.'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>
              Page {safePage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Transaction"
        message={
          deleteTarget
            ? `Permanently delete "${deleteTarget.name}" (${formatINR(deleteTarget.amount)})?`
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
