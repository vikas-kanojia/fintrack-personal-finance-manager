export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatINR(
  amount: number,
  options?: { showDecimals?: boolean; showSign?: boolean; compact?: boolean }
): string {
  const safe = Number.isFinite(amount) ? roundCurrency(amount) : 0;
  const abs = Math.abs(safe);

  if (options?.compact && abs >= 100000) {
    const signPrefix = safe < 0 ? '-' : options?.showSign && safe > 0 ? '+' : '';
    if (abs >= 10000000) {
      return `${signPrefix}₹${(abs / 10000000).toFixed(2)} Cr`;
    }
    return `${signPrefix}₹${(abs / 100000).toFixed(2)} L`;
  }

  const hasDecimals = options?.showDecimals ?? Math.abs(safe % 1) > 0.001;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(abs);

  if (safe < 0) return `-₹${formatted}`;
  if (options?.showSign && safe > 0) return `+₹${formatted}`;
  return `₹${formatted}`;
}

export function formatDateDDMMYYYY(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate || '—';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentMonthKey(): string {
  return getTodayISO().slice(0, 7);
}

export function getMonthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [yStr, mStr] = monthKey.split('-');
  const y = Number(yStr);
  const m = Number(mStr) - 1;
  const date = new Date(y, m + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthLabel(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const date = new Date(Number(yStr), Number(mStr) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function getFullMonthLabel(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const date = new Date(Number(yStr), Number(mStr) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function getDaysInMonth(monthKey: string): number {
  const [yStr, mStr] = monthKey.split('-');
  return new Date(Number(yStr), Number(mStr), 0).getDate();
}

export function getMonthBounds(monthKey: string): { start: string; end: string } {
  const days = getDaysInMonth(monthKey);
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(days).padStart(2, '0')}`,
  };
}

export function daysBetweenISO(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / (1000 * 60 * 60 * 24));
}

export function addDaysISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate()
  ).padStart(2, '0')}`;
}

export function advanceRecurringDate(
  isoDate: string,
  frequency: 'weekly' | 'monthly' | 'yearly'
): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (frequency === 'weekly') {
    return addDaysISO(isoDate, 7);
  }
  if (frequency === 'monthly') {
    const targetMonthDate = new Date(y, m, 1);
    const maxDay = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0).getDate();
    const clampedDay = Math.min(d, maxDay);
    return `${targetMonthDate.getFullYear()}-${String(targetMonthDate.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(clampedDay).padStart(2, '0')}`;
  }
  const nextYear = y + 1;
  const maxDay = new Date(nextYear, m, 0).getDate();
  const clampedDay = Math.min(d, maxDay);
  return `${nextYear}-${String(m).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

export function calcPercentChange(
  current: number,
  previous: number
): { pct: number | null; direction: 'up' | 'down' | 'flat'; label: string } {
  const curr = roundCurrency(current);
  const prev = roundCurrency(previous);

  if (prev === 0 && curr === 0) {
    return { pct: 0, direction: 'flat', label: '0.0%' };
  }
  if (prev === 0) {
    return {
      pct: null,
      direction: curr > 0 ? 'up' : 'down',
      label: curr > 0 ? '+100%' : '-100%',
    };
  }

  const rawPct = ((curr - prev) / Math.abs(prev)) * 100;
  const rounded = Math.round(rawPct * 10) / 10;
  if (Math.abs(rounded) < 0.05) {
    return { pct: 0, direction: 'flat', label: '0.0%' };
  }
  return {
    pct: rounded,
    direction: rounded > 0 ? 'up' : 'down',
    label: `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`,
  };
}

const ALLOWED_RECEIPT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
]);

export async function validateReceiptFile(
  file: File
): Promise<{ ok: true; dataUrl: string; name: string } | { ok: false; error: string }> {
  if (!ALLOWED_RECEIPT_TYPES.has(file.type)) {
    return {
      ok: false,
      error: 'Only PNG, JPG, WEBP, or PDF files are allowed for receipts.',
    };
  }
  if (file.size > 2 * 1024 * 1024) {
    return {
      ok: false,
      error: 'Receipt file size must be 2 MB or smaller.',
    };
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve({ ok: true, dataUrl: reader.result, name: file.name });
      } else {
        resolve({ ok: false, error: 'Unable to read receipt file.' });
      }
    };
    reader.onerror = () => resolve({ ok: false, error: 'Failed to read receipt file.' });
    reader.readAsDataURL(file);
  });
}

export async function hashSecret(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
