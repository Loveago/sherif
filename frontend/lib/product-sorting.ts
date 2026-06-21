import type { Product } from './types';

const NETWORK_ORDER = ['MTN', 'TELECEL', 'AIRTELTIGO'] as const;

const normalizeDataSize = (input: string): string => {
  const cleaned = input.trim().toUpperCase().replace(/\s/g, '');
  const digits = cleaned.replace(/\D/g, '');
  if (!digits) return '';
  if (cleaned.includes('MB')) return `${digits}MB`;
  return `${digits}GB`;
};

const parseDataSizeToMb = (value: string | null | undefined): number => {
  if (!value) return Number.POSITIVE_INFINITY;
  const normalized = normalizeDataSize(value);
  if (!normalized) return Number.POSITIVE_INFINITY;

  const cleaned = normalized.trim().toUpperCase().replace(/\s/g, '');

  const gbMatch = cleaned.match(/^(\d+(?:\.\d+)?)GB$/);
  if (gbMatch) {
    return Math.round(parseFloat(gbMatch[1]) * 1000);
  }

  const mbMatch = cleaned.match(/^(\d+(?:\.\d+)?)MB$/);
  if (mbMatch) {
    return Math.round(parseFloat(mbMatch[1]));
  }

  return Number.POSITIVE_INFINITY;
};

export const getProductSizeMb = (product: Product): number => {
  if (product.dataSize) {
    const size = parseDataSizeToMb(product.dataSize);
    if (Number.isFinite(size)) return size;
  }

  const fromDescription = parseDataSizeToMb(product.description);
  if (Number.isFinite(fromDescription)) return fromDescription;

  return parseDataSizeToMb(product.name);
};

const getNetworkPriorityFromStrings = (code?: string | null, name?: string | null): number => {
  const upperCode = (code || '').toUpperCase();
  const upperName = (name || '').toUpperCase();

  const idxByCode = NETWORK_ORDER.indexOf(upperCode as (typeof NETWORK_ORDER)[number]);
  if (idxByCode !== -1) return idxByCode;

  const idxByName = NETWORK_ORDER.findIndex((network) => upperName.includes(network));
  if (idxByName !== -1) return idxByName;

  return NETWORK_ORDER.length;
};

export const getNetworkPriority = (product: Product): number => {
  return getNetworkPriorityFromStrings(product.network?.code, product.network?.name);
};

export const sortProductsForDisplay = (products: Product[]): Product[] => {
  return [...products].sort((a, b) => {
    const aNet = getNetworkPriority(a);
    const bNet = getNetworkPriority(b);
    if (aNet !== bNet) return aNet - bNet;

    const aSize = getProductSizeMb(a);
    const bSize = getProductSizeMb(b);
    if (aSize !== bSize) return aSize - bSize;

    const aPrice = Number(a.sellingPrice ?? 0);
    const bPrice = Number(b.sellingPrice ?? 0);
    if (aPrice !== bPrice) return aPrice - bPrice;

    return a.name.localeCompare(b.name);
  });
};

export const sortProductsBySize = (products: Product[]): Product[] => {
  return [...products].sort((a, b) => {
    const aSize = getProductSizeMb(a);
    const bSize = getProductSizeMb(b);
    if (aSize !== bSize) return aSize - bSize;

    const aPrice = Number(a.sellingPrice ?? 0);
    const bPrice = Number(b.sellingPrice ?? 0);
    if (aPrice !== bPrice) return aPrice - bPrice;

    return a.name.localeCompare(b.name);
  });
};

export const sortNetworksByPriority = (networks: string[]): string[] => {
  return [...networks].sort((a, b) => {
    const aUpper = a.toUpperCase();
    const bUpper = b.toUpperCase();

    const aIdxCode = NETWORK_ORDER.indexOf(aUpper as (typeof NETWORK_ORDER)[number]);
    const bIdxCode = NETWORK_ORDER.indexOf(bUpper as (typeof NETWORK_ORDER)[number]);
    if (aIdxCode !== -1 || bIdxCode !== -1) {
      if (aIdxCode === -1) return 1;
      if (bIdxCode === -1) return -1;
      if (aIdxCode !== bIdxCode) return aIdxCode - bIdxCode;
    }

    const aIdxName = NETWORK_ORDER.findIndex((network) => aUpper.includes(network));
    const bIdxName = NETWORK_ORDER.findIndex((network) => bUpper.includes(network));
    if (aIdxName !== -1 || bIdxName !== -1) {
      if (aIdxName === -1) return 1;
      if (bIdxName === -1) return -1;
      if (aIdxName !== bIdxName) return aIdxName - bIdxName;
    }

    return aUpper.localeCompare(bUpper);
  });
};

export { NETWORK_ORDER };
