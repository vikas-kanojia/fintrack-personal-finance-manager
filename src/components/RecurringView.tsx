import React, { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Edit2, Plus, Trash2, X } from 'lucide-react';
import {
  PAYMENT_METHODS,
  PaymentMethod,
  RecurringFrequency,
  RecurringPayment,
} from '../types/finance';
import { useFinance } from '../store/financeStore';
import { computeMonthlyRecurringTotal } from '../utils/calculations';
import {
  daysBetweenISO,
  formatDateDDMMYYYY,
  formatINR,
  getTodayISO,
  roundCurrency,
} from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

export const RecurringView: React.FC = () => {
  const {
    vault,
    allExpenseCategories,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    recordRecurringAsExpense,
  } = useFinance();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringPayment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringPayment | null>(null);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(allExpenseCategories[0] || 'Subscriptions');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [nextPaymentDate, setNextPaymentDate] = useState(getTodayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [loggedToast, setLoggedToast] = useState<string | null>(null);

  const monthlyEstimate = useMemo(
    () => computeMonthlyRecurringTotal(vault.recurring),
    [vault.recurring]
  );

  const openCreate = () => {
    setEditing(null);
    setName('');
    setAmount('');
    setCategory(allExpenseCategories.includes('Subscriptions') ? 'Subscriptions' : allExpenseCategories[0]);
    setFrequency('monthly');
    setNextPaymentDate(getTodayISO());
    setPaymentMethod('UPI');
    setModalOpen(true);
  };

  const openEdit = (rec: RecurringPayment) => {
    setEditing(rec);
    setName(rec.name);
    setAmount(String(rec.amount));
    setCategory(rec.category);
    setFrequency(rec.frequency);
    setNextPaymentDate(rec.nextPaymentDate);
    setPaymentMethod(rec.paymentMethod);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = roundCurrency(Number(amount));
    if (!name.trim() || !Number.isFinite(num) || num <= 0) return;

    const payload = {
      name: name.trim(),
      amount: num,
      category,
      frequency,
      nextPaymentDate,
      paymentMethod,
      active: editing ? editing.active : true,
    };

    if (editing) {
      updateRecurring(editing.id, payload);
    } else {
      addRecurring(payload);
    }
    setModalOpen(false);
  };

  const handleRecordPayment = (rec: RecurringPayment) => {
    recordRecurringAsExpense(rec.id);
    setLoggedToast(`Logged "${rec.name}" (${formatINR(rec.amount)}) as an expense and advanced next due date.`);
    setTimeout(() => setLoggedToast(null), 3500);
  };

  const todayISO = getTodayISO();

  return (
    <div className="space-y-6">
      {/* Top Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Estimated Monthly Recurring
          </div>
          <div className="font-mono-num mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatINR(monthlyEstimate)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Normalized across weekly, monthly, and yearly bills
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Active Schedules
          </div>
          <div className="font-mono-num mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {vault.recurring.filter((r) => r.active).length}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Manual confirmation only · no auto-debits
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]">
          <div>
            <div className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Add Recurring Payment
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Rent, OTT, Wi-Fi, EMI, or insurance
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add Schedule
          </button>
        </div>
      </div>

      {loggedToast && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {loggedToast}
        </div>
      )}

      {/* List */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          Upcoming & Recurring Payments
        </h2>

        {vault.recurring.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="pb-3 pr-4">Payment Name</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Frequency</th>
                  <th className="pb-3 pr-4">Next Due Date</th>
                  <th className="pb-3 pr-4">Method</th>
                  <th className="pb-3 pr-4 text-right">Amount</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {vault.recurring.map((rec) => {
                  const days = daysBetweenISO(todayISO, rec.nextPaymentDate);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                        {rec.name}
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-600 dark:text-slate-300">
                        {rec.category}
                      </td>
                      <td className="py-3 pr-4 text-xs capitalize text-slate-600 dark:text-slate-300">
                        {rec.frequency}
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        <span className="font-mono-num text-slate-800 dark:text-slate-200">
                          {formatDateDDMMYYYY(rec.nextPaymentDate)}
                        </span>
                        <span
                          className={`ml-2 ${
                            days <= 0
                              ? 'font-semibold text-rose-500'
                              : days <= 5
                              ? 'text-amber-500'
                              : 'text-slate-400'
                          }`}
                        >
                          {days === 0
                            ? '· Due today'
                            : days < 0
                            ? `· ${Math.abs(days)}d overdue`
                            : `· in ${days}d`}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-600 dark:text-slate-300">
                        {rec.paymentMethod}
                      </td>
                      <td className="font-mono-num py-3 pr-4 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatINR(rec.amount)}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleRecordPayment(rec)}
                          title="Record as paid expense in ledger"
                          className="mr-1 inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Log Paid
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(rec)}
                          aria-label={`Edit ${rec.name}`}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(rec)}
                          aria-label={`Delete ${rec.name}`}
                          className="ml-1 rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 dark:text-slate-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarClock className="h-9 w-9 text-slate-400" />
            <h3 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-white">
              No recurring payments scheduled
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
              Track monthly rent, mobile recharge, internet, OTT subscriptions, or loan EMIs to receive due-date reminders.
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#111A2E]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3.5 dark:border-slate-800">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Recurring Payment' : 'Add Recurring Payment'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Payment Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. JioFiber Internet, Apartment Rent"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="font-mono-num w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
                  >
                    {allExpenseCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
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
                  Next Payment Date
                </label>
                <input
                  type="date"
                  required
                  value={nextPaymentDate}
                  onChange={(e) => setNextPaymentDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  {editing ? 'Save Changes' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Recurring Payment"
        message={
          deleteTarget
            ? `Remove "${deleteTarget.name}" (${formatINR(deleteTarget.amount)}) from your recurring bills?`
            : ''
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteRecurring(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};
