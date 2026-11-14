import { jsPDF } from 'jspdf';
import {
  AppNotification,
  BudgetConfig,
  PAYMENT_METHODS,
  PaymentMethod,
  RecurringPayment,
  SavingsGoal,
  Transaction,
  UserSettings,
} from '../types/finance';
import {
  calcPercentChange,
  daysBetweenISO,
  formatDateDDMMYYYY,
  formatINR,
  getMonthBounds,
  getMonthKey,
  getMonthLabel,
  getTodayISO,
  roundCurrency,
  shiftMonthKey,
} from './formatters';

export interface DashboardMetrics {
  totalBalance: number;
  prevMonthEndBalance: number;
  balanceChange: ReturnType<typeof calcPercentChange>;

  currentIncome: number;
  prevIncome: number;
  incomeChange: ReturnType<typeof calcPercentChange>;

  currentExpenses: number;
  prevExpenses: number;
  expensesChange: ReturnType<typeof calcPercentChange>;

  monthlySavings: number;
  prevMonthlySavings: number;
  savingsChange: ReturnType<typeof calcPercentChange>;

  savingsRate: number;
  prevSavingsRate: number;
  savingsRateDiffPts: number;

  overallBudget: number;
  remainingBudget: number;
  prevRemainingBudget: number;
  remainingBudgetChange: ReturnType<typeof calcPercentChange>;
  budgetUsedPct: number;
}

export function computeDashboardMetrics(
  transactions: Transaction[],
  budgets: BudgetConfig,
  monthKey: string
): DashboardMetrics {
  const prevMonthKey = shiftMonthKey(monthKey, -1);
  const { end: currentMonthEnd } = getMonthBounds(monthKey);
  const { end: prevMonthEnd } = getMonthBounds(prevMonthKey);

  let totalBalance = 0;
  let prevMonthEndBalance = 0;
  let currentIncome = 0;
  let prevIncome = 0;
  let currentExpenses = 0;
  let prevExpenses = 0;

  for (const tx of transactions) {
    const txMonth = getMonthKey(tx.date);
    const signed = tx.type === 'income' ? tx.amount : -tx.amount;

    if (tx.date <= currentMonthEnd) {
      totalBalance += signed;
    }

    if (tx.date <= prevMonthEnd) {
      prevMonthEndBalance += signed;
    }

    if (txMonth === monthKey) {
      if (tx.type === 'income') currentIncome += tx.amount;
      else currentExpenses += tx.amount;
    } else if (txMonth === prevMonthKey) {
      if (tx.type === 'income') prevIncome += tx.amount;
      else prevExpenses += tx.amount;
    }
  }

  totalBalance = roundCurrency(totalBalance);
  prevMonthEndBalance = roundCurrency(prevMonthEndBalance);
  currentIncome = roundCurrency(currentIncome);
  prevIncome = roundCurrency(prevIncome);
  currentExpenses = roundCurrency(currentExpenses);
  prevExpenses = roundCurrency(prevExpenses);

  const monthlySavings = roundCurrency(currentIncome - currentExpenses);
  const prevMonthlySavings = roundCurrency(prevIncome - prevExpenses);

  const savingsRate =
    currentIncome > 0 ? Math.round(((monthlySavings / currentIncome) * 100) * 10) / 10 : 0;
  const prevSavingsRate =
    prevIncome > 0 ? Math.round(((prevMonthlySavings / prevIncome) * 100) * 10) / 10 : 0;
  const savingsRateDiffPts = Math.round((savingsRate - prevSavingsRate) * 10) / 10;

  const overallBudget = roundCurrency(budgets.overallMonthlyBudget);
  const remainingBudget = roundCurrency(overallBudget - currentExpenses);
  const prevRemainingBudget = roundCurrency(overallBudget - prevExpenses);
  const budgetUsedPct =
    overallBudget > 0 ? Math.round(((currentExpenses / overallBudget) * 100) * 10) / 10 : 0;

  return {
    totalBalance,
    prevMonthEndBalance,
    balanceChange: calcPercentChange(totalBalance, prevMonthEndBalance),

    currentIncome,
    prevIncome,
    incomeChange: calcPercentChange(currentIncome, prevIncome),

    currentExpenses,
    prevExpenses,
    expensesChange: calcPercentChange(currentExpenses, prevExpenses),

    monthlySavings,
    prevMonthlySavings,
    savingsChange: calcPercentChange(monthlySavings, prevMonthlySavings),

    savingsRate,
    prevSavingsRate,
    savingsRateDiffPts,

    overallBudget,
    remainingBudget,
    prevRemainingBudget,
    remainingBudgetChange: calcPercentChange(remainingBudget, prevRemainingBudget),
    budgetUsedPct,
  };
}

export interface MonthlySeriesPoint {
  monthKey: string;
  label: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
}

export function computeMonthlySeries(
  transactions: Transaction[],
  anchorMonthKey: string,
  monthsCount = 6
): MonthlySeriesPoint[] {
  const keys: string[] = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    keys.push(shiftMonthKey(anchorMonthKey, -i));
  }

  const map = new Map<string, { income: number; expenses: number }>();
  for (const k of keys) {
    map.set(k, { income: 0, expenses: 0 });
  }

  for (const tx of transactions) {
    const mk = getMonthKey(tx.date);
    const bucket = map.get(mk);
    if (!bucket) continue;
    if (tx.type === 'income') bucket.income += tx.amount;
    else bucket.expenses += tx.amount;
  }

  return keys.map((k) => {
    const b = map.get(k)!;
    const income = roundCurrency(b.income);
    const expenses = roundCurrency(b.expenses);
    const savings = roundCurrency(income - expenses);
    const savingsRate = income > 0 ? Math.round(((savings / income) * 100) * 10) / 10 : 0;
    return {
      monthKey: k,
      label: getMonthLabel(k),
      income,
      expenses,
      savings,
      savingsRate,
    };
  });
}

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  color: string;
}

const CHART_PALETTE = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#8B5CF6', // violet
  '#F59E0B', // amber
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#EF4444', // red
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#F97316', // orange
];

export function computeCategoryBreakdown(
  transactions: Transaction[],
  type: 'expense' | 'income' = 'expense'
): CategoryBreakdownItem[] {
  const filtered = transactions.filter((t) => t.type === type);
  const totals = new Map<string, { amount: number; count: number }>();

  let grandTotal = 0;
  for (const tx of filtered) {
    grandTotal += tx.amount;
    const prev = totals.get(tx.category) ?? { amount: 0, count: 0 };
    totals.set(tx.category, {
      amount: roundCurrency(prev.amount + tx.amount),
      count: prev.count + 1,
    });
  }

  const sorted = Array.from(totals.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: grandTotal > 0 ? Math.round((data.amount / grandTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return sorted.map((item, idx) => ({
    ...item,
    color: CHART_PALETTE[idx % CHART_PALETTE.length],
  }));
}

export interface PaymentMethodBreakdownItem {
  method: PaymentMethod;
  amount: number;
  count: number;
  percentage: number;
}

export function computePaymentMethodBreakdown(
  transactions: Transaction[],
  type: 'expense' | 'income' | 'all' = 'expense'
): PaymentMethodBreakdownItem[] {
  const filtered = type === 'all' ? transactions : transactions.filter((t) => t.type === type);
  const map = new Map<PaymentMethod, { amount: number; count: number }>();
  for (const m of PAYMENT_METHODS) {
    map.set(m, { amount: 0, count: 0 });
  }

  let total = 0;
  for (const tx of filtered) {
    total += tx.amount;
    const prev = map.get(tx.paymentMethod) ?? { amount: 0, count: 0 };
    map.set(tx.paymentMethod, {
      amount: roundCurrency(prev.amount + tx.amount),
      count: prev.count + 1,
    });
  }

  return Array.from(map.entries())
    .map(([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count,
      percentage: total > 0 ? Math.round((data.amount / total) * 1000) / 10 : 0,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.amount - a.amount);
}

export interface BudgetProgressItem {
  key: string;
  label: string;
  allocated: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: 'safe' | 'info' | 'warning' | 'high' | 'exceeded';
}

function getBudgetStatus(percentUsed: number): BudgetProgressItem['status'] {
  if (percentUsed >= 100) return 'exceeded';
  if (percentUsed >= 90) return 'high';
  if (percentUsed >= 75) return 'warning';
  if (percentUsed >= 50) return 'info';
  return 'safe';
}

export function computeBudgetProgress(
  transactions: Transaction[],
  budgets: BudgetConfig,
  monthKey: string
): { overall: BudgetProgressItem | null; categories: BudgetProgressItem[] } {
  const monthExpenses = transactions.filter(
    (t) => t.type === 'expense' && getMonthKey(t.date) === monthKey
  );

  const totalSpent = roundCurrency(monthExpenses.reduce((sum, t) => sum + t.amount, 0));
  const spentByCategory = new Map<string, number>();
  for (const tx of monthExpenses) {
    spentByCategory.set(
      tx.category,
      roundCurrency((spentByCategory.get(tx.category) ?? 0) + tx.amount)
    );
  }

  const overall: BudgetProgressItem | null =
    budgets.overallMonthlyBudget > 0
      ? (() => {
          const allocated = roundCurrency(budgets.overallMonthlyBudget);
          const remaining = roundCurrency(allocated - totalSpent);
          const percentUsed = Math.round((totalSpent / allocated) * 1000) / 10;
          return {
            key: 'overall',
            label: 'Overall Monthly Budget',
            allocated,
            spent: totalSpent,
            remaining,
            percentUsed,
            status: getBudgetStatus(percentUsed),
          };
        })()
      : null;

  const categories: BudgetProgressItem[] = Object.entries(budgets.categoryBudgets)
    .filter(([, limit]) => limit > 0)
    .map(([category, limit]) => {
      const allocated = roundCurrency(limit);
      const spent = spentByCategory.get(category) ?? 0;
      const remaining = roundCurrency(allocated - spent);
      const percentUsed = Math.round((spent / allocated) * 1000) / 10;
      return {
        key: category,
        label: category,
        allocated,
        spent,
        remaining,
        percentUsed,
        status: getBudgetStatus(percentUsed),
      };
    })
    .sort((a, b) => b.percentUsed - a.percentUsed);

  return { overall, categories };
}

export function computeMonthlyRecurringTotal(recurring: RecurringPayment[]): number {
  let total = 0;
  for (const r of recurring) {
    if (!r.active) continue;
    if (r.frequency === 'monthly') total += r.amount;
    else if (r.frequency === 'weekly') total += (r.amount * 52) / 12;
    else if (r.frequency === 'yearly') total += r.amount / 12;
  }
  return roundCurrency(total);
}

export function evaluateNewNotifications(
  userId: string,
  existing: AppNotification[],
  transactions: Transaction[],
  budgets: BudgetConfig,
  goals: SavingsGoal[],
  recurring: RecurringPayment[],
  settings: UserSettings,
  monthKey: string
): AppNotification[] {
  const existingKeys = new Set(existing.map((n) => n.dedupeKey));
  const additions: AppNotification[] = [];
  const nowIso = new Date().toISOString();
  const todayISO = getTodayISO();

  const pushUnique = (
    dedupeKey: string,
    payload: Omit<AppNotification, 'id' | 'userId' | 'dedupeKey' | 'createdAt' | 'read'>
  ) => {
    if (existingKeys.has(dedupeKey)) return;
    existingKeys.add(dedupeKey);
    additions.push({
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      dedupeKey,
      createdAt: nowIso,
      read: false,
      ...payload,
    });
  };

  // 1. Budget threshold notifications (50%, 75%, 90%, 100%) - highest crossed threshold without repeating
  if (settings.notifyBudgetThresholds) {
    const { overall, categories } = computeBudgetProgress(transactions, budgets, monthKey);
    const items = overall ? [overall, ...categories] : categories;
    const thresholds = [
      { pct: 100, severity: 'critical' as const, label: 'Budget Exceeded (100%+)' },
      { pct: 90, severity: 'high' as const, label: 'High-Priority Warning (90%+)' },
      { pct: 75, severity: 'warning' as const, label: 'Budget Warning (75%+)' },
      { pct: 50, severity: 'info' as const, label: 'Budget Update (50%+)' },
    ];

    for (const item of items) {
      for (const th of thresholds) {
        if (item.percentUsed >= th.pct) {
          const dedupeKey = `budget:${monthKey}:${item.key}:${th.pct}`;
          if (!existingKeys.has(dedupeKey)) {
            pushUnique(dedupeKey, {
              category: 'budget',
              severity: th.severity,
              title: `${item.label} — ${th.label}`,
              message:
                th.pct >= 100
                  ? `Spent ${formatINR(item.spent)} of ${formatINR(item.allocated)} (${item.percentUsed}%). Exceeded by ${formatINR(Math.abs(item.remaining))}.`
                  : `Used ${item.percentUsed}% (${formatINR(item.spent)} of ${formatINR(item.allocated)}). ${formatINR(item.remaining)} remaining.`,
            });
          }
          // Only trigger the highest reached threshold if none fired yet, or prevent flooding lower ones simultaneously
          break;
        }
      }
    }
  }

  // 2. Monthly savings below target (only when user has expenses/income in month and target > 0)
  if (settings.notifySavingsBelowTarget && settings.monthlySavingsTarget > 0) {
    const metrics = computeDashboardMetrics(transactions, budgets, monthKey);
    const hasActivity = metrics.currentIncome > 0 || metrics.currentExpenses > 0;
    if (hasActivity && metrics.monthlySavings < settings.monthlySavingsTarget) {
      const dedupeKey = `savings_below:${monthKey}:${settings.monthlySavingsTarget}`;
      pushUnique(dedupeKey, {
        category: 'savings',
        severity: 'warning',
        title: 'Monthly Savings Below Target',
        message: `Current savings for ${getMonthLabel(monthKey)} are ${formatINR(metrics.monthlySavings)}, below your target of ${formatINR(settings.monthlySavingsTarget)}.`,
      });
    }
  }

  // 3. Approaching recurring payments (due within 5 days or overdue)
  if (settings.notifyRecurringUpcoming) {
    for (const rec of recurring) {
      if (!rec.active) continue;
      const diff = daysBetweenISO(todayISO, rec.nextPaymentDate);
      if (diff <= 5 && diff >= -7) {
        const dedupeKey = `recurring:${rec.id}:${rec.nextPaymentDate}`;
        pushUnique(dedupeKey, {
          category: 'recurring',
          severity: diff <= 1 ? 'high' : 'info',
          title:
            diff < 0
              ? `Recurring Payment Due: ${rec.name}`
              : diff === 0
              ? `Recurring Payment Due Today: ${rec.name}`
              : `Upcoming Payment in ${diff} day${diff === 1 ? '' : 's'}: ${rec.name}`,
          message: `${formatINR(rec.amount)} via ${rec.paymentMethod} scheduled for ${formatDateDDMMYYYY(rec.nextPaymentDate)}.`,
        });
      }
    }
  }

  // 4. Financial goal completion
  if (settings.notifyGoalCompleted) {
    for (const goal of goals) {
      if (goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount) {
        const dedupeKey = `goal_done:${goal.id}`;
        pushUnique(dedupeKey, {
          category: 'goal',
          severity: 'success',
          title: `Goal Completed: ${goal.name}`,
          message: `You reached ${formatINR(goal.currentAmount)} of your ${formatINR(goal.targetAmount)} target.`,
        });
      }
    }
  }

  return additions;
}

export function exportTransactionsCSV(transactions: Transaction[], filename = 'fintrack-transactions.csv') {
  const headers = ['Date', 'Transaction Name', 'Category', 'Type', 'Payment Method', 'Amount (INR)', 'Notes'];
  const escape = (val: string | number) => {
    const str = String(val ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = transactions.map((tx) => [
    formatDateDDMMYYYY(tx.date),
    tx.name,
    tx.category,
    tx.type === 'income' ? 'Income' : 'Expense',
    tx.paymentMethod,
    tx.amount.toFixed(2),
    tx.notes || '',
  ]);

  const csvContent = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ReportSummaryPayload {
  periodTitle: string;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  categories: CategoryBreakdownItem[];
  budgetItems: BudgetProgressItem[];
  transactions: Transaction[];
}

export function downloadFinancialReportPDF(payload: ReportSummaryPayload) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 48;

  const pdfINR = (n: number) => {
    const abs = Math.abs(roundCurrency(n));
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: Math.abs(n % 1) > 0.001 ? 2 : 0,
      maximumFractionDigits: Math.abs(n % 1) > 0.001 ? 2 : 0,
    }).format(abs);
    return `${n < 0 ? '-' : ''}INR ${formatted}`;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FinTrack Financial Summary Report', 40, y);
  y += 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Period: ${payload.periodTitle}   |   Generated: ${formatDateDDMMYYYY(getTodayISO())}`, 40, y);
  y += 24;

  doc.setDrawColor(203, 213, 225);
  doc.line(40, y, pageWidth - 40, y);
  y += 22;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Overview', 40, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  const summaryLines = [
    ['Total Income', pdfINR(payload.totalIncome)],
    ['Total Expenses', pdfINR(payload.totalExpenses)],
    ['Net Savings', pdfINR(payload.netSavings)],
    ['Savings Rate', `${payload.savingsRate.toFixed(1)}%`],
  ];

  for (const [label, val] of summaryLines) {
    doc.text(label, 48, y);
    doc.setFont('helvetica', 'bold');
    doc.text(val, 220, y);
    doc.setFont('helvetica', 'normal');
    y += 16;
  }

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Expense Category Breakdown', 40, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (payload.categories.length === 0) {
    doc.text('No expenses recorded in this period.', 48, y);
    y += 16;
  } else {
    for (const cat of payload.categories.slice(0, 12)) {
      if (y > 760) {
        doc.addPage();
        y = 48;
      }
      doc.text(`${cat.category} (${cat.count})`, 48, y);
      doc.text(`${pdfINR(cat.amount)} (${cat.percentage.toFixed(1)}%)`, 300, y);
      y += 15;
    }
  }

  if (payload.budgetItems.length > 0) {
    y += 14;
    if (y > 720) {
      doc.addPage();
      y = 48;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Budget Performance', 40, y);
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    for (const b of payload.budgetItems.slice(0, 12)) {
      if (y > 760) {
        doc.addPage();
        y = 48;
      }
      doc.text(b.label, 48, y);
      doc.text(
        `${pdfINR(b.spent)} / ${pdfINR(b.allocated)} (${b.percentUsed.toFixed(1)}%)`,
        260,
        y
      );
      y += 15;
    }
  }

  y += 14;
  if (y > 720) {
    doc.addPage();
    y = 48;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Transactions (${payload.transactions.length})`, 40, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  if (payload.transactions.length === 0) {
    doc.text('No transactions recorded in this period.', 48, y);
  } else {
    for (const tx of payload.transactions.slice(0, 35)) {
      if (y > 770) {
        doc.addPage();
        y = 48;
      }
      const sign = tx.type === 'income' ? '+' : '-';
      doc.text(formatDateDDMMYYYY(tx.date), 48, y);
      doc.text(tx.name.slice(0, 28), 118, y);
      doc.text(tx.category.slice(0, 18), 285, y);
      doc.text(`${sign}${pdfINR(tx.amount)}`, 425, y);
      y += 14;
    }
  }

  doc.save(`fintrack-report-${payload.periodTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
