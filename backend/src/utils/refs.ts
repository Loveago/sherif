import { customAlphabet } from 'nanoid';

const alphaNumeric = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);

export const generateReference = (prefix: string) => `${prefix}-${alphaNumeric()}`;
