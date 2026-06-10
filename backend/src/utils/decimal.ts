export const toMoneyNumber = (value: unknown) => Number(value ?? 0);

export const sumMoney = (values: unknown[]) =>
  values.reduce<number>((total, currentValue) => total + toMoneyNumber(currentValue), 0);
