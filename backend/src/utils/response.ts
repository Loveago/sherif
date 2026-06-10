export const toPlain = <T>(value: T): T => {
  return JSON.parse(
    JSON.stringify(value, (_, currentValue) => {
      if (
        currentValue &&
        typeof currentValue === 'object' &&
        'toNumber' in currentValue &&
        typeof (currentValue as { toNumber: () => number }).toNumber === 'function'
      ) {
        return (currentValue as { toNumber: () => number }).toNumber();
      }

      if (currentValue instanceof Date) {
        return currentValue.toISOString();
      }

      return currentValue;
    }),
  ) as T;
};

export const createSuccessResponse = <T>(data: T, message?: string) => ({
  success: true,
  message,
  data: toPlain(data),
});
