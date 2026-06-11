import { randomInt } from 'crypto';

type OrderSourceType = 'BUY_NOW' | 'BULK' | 'STOREFRONT';

const monthAbbreviations = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const orderPrefixBySource: Record<OrderSourceType, 'DASH' | 'BULK' | 'STORE'> = {
  BUY_NOW: 'DASH',
  BULK: 'BULK',
  STOREFRONT: 'STORE',
};

export const generateOrderReference = (source: OrderSourceType) => {
  const now = new Date();
  const month = monthAbbreviations[now.getUTCMonth()];
  const day = String(now.getUTCDate()).padStart(2, '0');
  const year = String(now.getUTCFullYear()).slice(-2);
  const suffix = String(randomInt(100000, 1000000));

  return `${orderPrefixBySource[source]}-${month}${day}${year}-${suffix}`;
};
