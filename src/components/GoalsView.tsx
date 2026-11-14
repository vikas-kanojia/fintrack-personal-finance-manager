import React, { useState } from 'react';
import { Edit2, Plus, Target, Trash2, X } from 'lucide-react';
import { SavingsGoal } from '../types/finance';
import { useFinance } from '../store/financeStore';
import {
  daysBetweenISO,
  formatDateDDMMYYYY,
  formatINR,
  getTodayISO,
  roundCurrency,
} from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

export const GoalsView: React.FC = () => {
  const { vault, addGoal, updateGoal, contributeGoal, deleteGoal } = useFinance();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null);
  const [contributionInputs, setContributionInputs] = useState<Record<string, string>>({});

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState(getTodayISO());

  const openCreate = () => {
    setEditing(null);
    setName('');
    setTargetAmount('');
    setCurrentAmount('0');
    setTargetDate(getTodayISO());
    setModalOpen(true);
  };

  const openEdit = (goal: SavingsGoal) => {
    setEditing(goal);
    setName(goal.name);
    setTargetAmount(String(goal.targetAmount));
    setCurrentAmount(String(goal.currentAmount));
    setTargetDate(goal.targetDate);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = roundCurrency(Number(targetAmount));
    const current = Math.max(0, roundCurrency(Number(currentAmount) || 0));
    if (!name.trim() || !Number.isFinite(target) || target <= 0) return;

    if (editing) {
      updateGoal(editing.id, {
        name: name.trim(),
        targetAmount: target,
        currentAmount: current,
        targetDate,
      });
    } else {
      addGoal({
        name: name.trim(),
        targetAmount: target,
        currentAmount: current,
        targetDate,
      });
    }
    setModalOpen(false);
  };

  const handleAddContribution = (goalId: string) => {
    const val = roundCurrency(Number(contributionInputs[goalId] || 0));
    if (val <= 0) return;
    contributeGoal(goalId, val);
    setContributionInputs((prev) => ({ ...prev, [goalId]: '' }));
  };

  const todayISO = getTodayISO();

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center dark:border-slate-800/90 dark:bg-[#111A2E]">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Financial Goals
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Track progress toward your emergency fund, gadgets, travel, or investment targets.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Goal
        </button>
      </div>

      {/* Goals Grid */}
      {vault.goals.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {vault.goals.map((goal) => {
            const pct =
              goal.targetAmount > 0
                ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 1000) / 10)
                : 0;
            const remaining = Math.max(0, roundCurrency(goal.targetAmount - goal.currentAmount));
            const daysLeft = daysBetweenISO(todayISO, goal.targetDate);
            const statusText =
              remaining === 0
                ? 'Goal Completed'
                : daysLeft < 0
                ? `Target date passed (${formatDateDDMMYYYY(goal.targetDate)})`
                : `${daysLeft} days left · Target ${formatDateDDMMYYYY(goal.targetDate)}`;

            return (
              <div
                key={goal.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800/90 dark:bg-[#111A2E]"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                        {goal.name}
                      </h3>
                      <p
                        className={`mt-0.5 text-xs ${
                          remaining === 0
                            ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {statusText}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(goal)}
                        aria-label={`Edit ${goal.name}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(goal)}
                        aria-label={`Delete ${goal.name}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="font-mono-num text-xl font-bold text-slate-900 dark:text-white">
                      {formatINR(goal.currentAmount)}
                    </span>
                    <span className="font-mono-num text-xs text-slate-500 dark:text-slate-400">
                      of {formatINR(goal.targetAmount)}
                    </span>
                  </div>

                  <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono-num font-semibold text-emerald-600 dark:text-emerald-400">
                      {pct.toFixed(1)}%
                    </span>
                    <span className="font-mono-num">
                      {remaining === 0 ? 'Target met' : `${formatINR(remaining)} remaining`}
                    </span>
                  </div>
                </div>

                {remaining > 0 && (
                  <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3.5 dark:border-slate-800/80">
                    <input
                      type="number"
                      min="1"
                      step="100"
                      value={contributionInputs[goal.id] ?? ''}
                      onChange={(e) =>
                        setContributionInputs((prev) => ({ ...prev, [goal.id]: e.target.value }))
                      }
                      placeholder="Add ₹"
                      className="font-mono-num w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddContribution(goal.id)}
                      className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap shrink-0"
                    >
                      Contribute
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-14 text-center dark:border-slate-800/90 dark:bg-[#111A2E]">
          <Target className="h-9 w-9 text-slate-400" />
          <h3 className="mt-3 font-display text-sm font-semibold text-slate-900 dark:text-white">
            No financial goals created yet
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Create an Emergency Fund, New Laptop, Vacation, or Investment target to track every contribution.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Create First Goal
          </button>
        </div>
      )}

      {/* Goal Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#111A2E]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3.5 dark:border-slate-800">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                {editing ? 'Edit Financial Goal' : 'Create Financial Goal'}
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
                  Goal Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Emergency Fund, Vacation, New Laptop"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Target Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="100"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="100000"
                    className="font-mono-num w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Current Saved (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="0"
                    className="font-mono-num w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-[#0B1221] dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Target Date
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
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
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  {editing ? 'Save Goal' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Financial Goal"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}" (${formatINR(deleteTarget.currentAmount)} saved)?`
            : ''
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteGoal(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};
