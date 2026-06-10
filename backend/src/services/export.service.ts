import * as XLSX from 'xlsx';

export const exportToCSV = (data: any[], filename: string): Buffer => {
  try {
    const flatData = data.map((item) => flattenObject(item));
    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    return XLSX.write(workbook, { bookType: 'csv', type: 'buffer' });
  } catch (error) {
    throw new Error('Failed to export to CSV');
  }
};

export const exportToExcel = (data: any[], filename: string): Buffer => {
  try {
    const flatData = data.map((item) => flattenObject(item));
    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  } catch (error) {
    throw new Error('Failed to export to Excel');
  }
};

export const exportToJSON = (data: any[]): string => {
  return JSON.stringify(data, null, 2);
};

export const generateHeaders = (data: any[]): string[] => {
  if (data.length === 0) return [];
  return Object.keys(flattenObject(data[0]));
};

export const flattenObject = (obj: any, prefix = ''): any => {
  const flattened: any = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value === null || value === undefined) {
        flattened[newKey] = '';
      } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        flattened[newKey] = value.join('; ');
      } else if (value instanceof Date) {
        flattened[newKey] = value.toISOString();
      } else {
        flattened[newKey] = value;
      }
    }
  }

  return flattened;
};
