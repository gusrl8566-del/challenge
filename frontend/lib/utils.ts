import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(
  num: number | null | undefined,
  decimals: number = 1,
): string {
  if (num === null || num === undefined) {
    return '-';
  }

  const parsed = Number(num);
  if (!Number.isFinite(parsed)) {
    return '-';
  }

  return parsed.toFixed(decimals);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
