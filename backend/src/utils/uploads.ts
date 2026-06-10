import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

export type ParsedBulkRecord = {
  phoneNumber: string;
  productName: string;
};

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

export const parseBulkFile = (fileName: string, buffer: Buffer): ParsedBulkRecord[] => {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.csv')) {
    const rows = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    return rows.map((row) => {
      const entries = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
      );

      return {
        phoneNumber: String(entries['phone number'] ?? entries.phone ?? '').trim(),
        productName: String(entries.product ?? entries.bundle ?? '').trim(),
      };
    });
  }

  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet);

    return rows.map((row) => {
      const entries = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
      );

      return {
        phoneNumber: String(entries['phone number'] ?? entries.phone ?? '').trim(),
        productName: String(entries.product ?? entries.bundle ?? '').trim(),
      };
    });
  }

  throw new Error('Unsupported file type. Please upload CSV or XLSX.');
};
