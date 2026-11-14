import React, { useEffect, useState } from 'react';
import { FileText, Paperclip, Trash2, X } from 'lucide-react';
import {
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  PaymentMethod,
  Transaction,
  TransactionType,
} from '../types/finance';
import { useFinance } from '../store/financeStore';
import { getTodayISO, roundCurrency, validateReceiptFile } from '../utils/formatters';

interface TransactionModalProps {
  open: boolean;
  initialType: TransactionType;
  editingTransaction?: Transaction | null;
  onClose: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  open,
  initialType,
  editingTransaction,
  onClose,
}) => {
  const { addTransaction, updateTransaction, allExpenseCategories } = useFinance();

  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState('');
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | undefined>(undefined);
  const [receiptName, setReceiptName] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(String(editingTransaction.amount));
      setName(editingTransaction.name);
      setCategory(editingTransaction.category);
      setDate(editingTransaction.date);
      setPaymentMethod(editingTransaction.paymentMethod);
      setNotes(editingTransaction.notes || '');
      setReceiptDataUrl(editingTransaction.receiptDataUrl);
      setReceiptName(editingTransaction.receiptName);
    } else {
      setType(initialType);
      setAmount('');
      setName('');
      setCategory(initialType === 'income' ? INCOME_CATEGORIES[0] : allExpenseCategories[0]);
      setDate(getTodayISO());
      setPaymentMethod('UPI');
      setNotes('');
      setReceiptDataUrl(undefined);
      setReceiptName(undefined);
    }
  }, [open, initialType, editingTransaction, allExpenseCategories]);

  const categories = type === 'income' ? [...INCOME_CATEGORIES] : allExpenseCategories;

  const handleTypeSwitch = (nextType: TransactionType) => {
    setType(nextType);
    const nextList = nextType === 'income' ? [...INCOME_CATEGORIES] : allExpenseCategories;
    if (!nextList.includes(category)) {
      setCategory(nextList[0]);
    }
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await validateReceiptFile(file);
    if (res.ok === false) {
      setError(res.error);
      return;
    }
    setError(null);
    setReceiptDataUrl(res.dataUrl);
    setReceiptName(res.name);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = roundCurrency(Number(amount));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }
    if (!name.trim()) {
      setError(
        type === 'income'
          ? 'Please enter an income source.'
          : 'Please enter an expense name.'
      );
      return;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Please select a valid date.');
      return;
    }

    const payload = {
      type,
      amount: numeric,
      name: name.trim(),
      category: category || categories[0],
      date,
      paymentMethod,
      notes: notes.trim(),
      receiptDataUrl: type === 'expense' ? receiptDataUrl : undefined,
      receiptName: type === 'expense' ? receiptName : undefined,
    };

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, payload);
    } else {
      addTransaction(payload);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#111A2E]">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <h2
            id="tx-modal-title"
            className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            {editingTransaction
              ? `Edit ${type === 'income' ? 'Income' : 'Expense'}`
              : type === 'income'
              ? 'Add Income'
              : 'Add Expense'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Type Switcher */}
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-900/90">
            <button
              type="button"
              onClick={() => handleTypeSwitch('expense')}
              className={`rounded-lg py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                type === 'expense'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => handleTypeSwitch('income')}
              className={`rounded-lg py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Income
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="font-mono-num w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
              {type === 'income' ? 'Income Source' : 'Expense Name'}
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                type === 'income'
                  ? 'e.g., Monthly Salary, Client Retainer'
                  : 'e.g., BigBasket Groceries, Metro Card'
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
              {type === 'income' ? 'Notes (Optional)' : 'Description (Optional)'}
            </label>
            <textarea
              rows={2}
              maxLength={240}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any extra context..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
            />
          </div>

          {type === 'expense' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                Receipt Attachment (Optional · PNG, JPG, WEBP, PDF max 2 MB)
              </label>
              {receiptDataUrl ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-700 dark:bg-[#0B1221]">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                    <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                      {receiptName || 'Attached receipt'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptDataUrl(undefined);
                      setReceiptName(undefined);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 text-xs font-medium text-slate-600 transition-colors hover:border-blue-500 hover:text-blue-500 dark:border-slate-700 dark:bg-[#0B1221]/60 dark:text-slate-400">
                  <Paperclip className="h-4 w-4" />
                  <span>Attach receipt image or PDF</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={handleReceiptChange}
                    className="sr-only"
                  />
                </label>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="whitespace-nowrap shrink-0 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`whitespace-nowrap shrink-0 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors ${
                type === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {editingTransaction ? 'Save Changes' : type === 'income' ? 'Save Income' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
