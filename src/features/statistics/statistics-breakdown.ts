import { FinanceTransaction } from '@/features/finance/data';
import {
  CategoryColorMap,
  getCategoryColor,
} from '@/features/finance/finance-settings';

export type CategorySort = 'high' | 'low';

export type CategorySlice = {
  amount: number;
  color: string;
  count: number;
  name: string;
  percentage: number;
};

export const getCategoryBreakdown = (
  transactions: FinanceTransaction[],
  valueSelector: (transaction: FinanceTransaction) => number,
  categoryColors: CategoryColorMap = {},
) => {
  const totalsByCategory = new Map<string, { amount: number; count: number }>();

  transactions.forEach((transaction) => {
    const amount = valueSelector(transaction);

    if (amount <= 0) {
      return;
    }

    const current = totalsByCategory.get(transaction.category) ?? {
      amount: 0,
      count: 0,
    };

    totalsByCategory.set(transaction.category, {
      amount: current.amount + amount,
      count: current.count + 1,
    });
  });

  const total = Array.from(totalsByCategory.values()).reduce(
    (sum, item) => sum + item.amount,
    0,
  );

  return Array.from(totalsByCategory.entries())
    .map(([name, item], index) => ({
      amount: item.amount,
      color: getCategoryColor(name, categoryColors, index),
      count: item.count,
      name,
      percentage: total > 0 ? (item.amount / total) * 100 : 0,
    }))
    .toSorted((left, right) => right.amount - left.amount);
};

export const getCountBreakdown = (
  transactions: FinanceTransaction[],
  categoryColors: CategoryColorMap = {},
) => {
  const totalsByCategory = new Map<string, { amount: number; count: number }>();

  transactions.forEach((transaction) => {
    const current = totalsByCategory.get(transaction.category) ?? {
      amount: 0,
      count: 0,
    };

    totalsByCategory.set(transaction.category, {
      amount: current.amount + 1,
      count: current.count + 1,
    });
  });

  const total = transactions.length;

  return Array.from(totalsByCategory.entries())
    .map(([name, item], index) => ({
      amount: item.amount,
      color: getCategoryColor(name, categoryColors, index),
      count: item.count,
      name,
      percentage: total > 0 ? (item.count / total) * 100 : 0,
    }))
    .toSorted((left, right) => right.count - left.count);
};

export const formatPercentage = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value > 0 && value < 1 ? 1 : 0,
  }).format(value);

export const sortCategorySlices = (
  slices: CategorySlice[],
  sort: CategorySort,
) =>
  slices.toSorted((left, right) =>
    sort === 'high' ? right.amount - left.amount : left.amount - right.amount,
  );

export const getSliceLabel = (slice: CategorySlice) =>
  `${slice.name}: ${formatPercentage(slice.percentage)}%`;

const getPointOnCircle = (radius: number, angle: number) => {
  const radians = ((angle - 90) * Math.PI) / 180;

  return {
    x: 60 + radius * Math.cos(radians),
    y: 60 + radius * Math.sin(radians),
  };
};

export const getDonutSegmentPath = (
  startPercentage: number,
  endPercentage: number,
) => {
  const startAngle = startPercentage * 3.6;
  const endAngle = endPercentage * 3.6;
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = getPointOnCircle(54, startAngle);
  const outerEnd = getPointOnCircle(54, endAngle);
  const innerStart = getPointOnCircle(36, startAngle);
  const innerEnd = getPointOnCircle(36, endAngle);

  if (endPercentage - startPercentage >= 99.999) {
    return [
      'M 60 6',
      'A 54 54 0 1 1 59.99 6',
      'Z',
      'M 60 24',
      'A 36 36 0 1 0 59.99 24',
      'Z',
    ].join(' ');
  }

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A 54 54 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A 36 36 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
};
