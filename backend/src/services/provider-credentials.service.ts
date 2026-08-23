import crypto from 'crypto';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

export type ProviderCode = 'shank' | 'bundleportal';

export interface ProviderCredentials {
  apiKey: string;
  baseUrl: string;
  source: 'database' | 'environment' | 'none';
}

const PROVIDER_DEFAULTS: Record<ProviderCode, { apiKey?: string; baseUrl: string }> = {
  shank: {
    apiKey: env.SHANK_API_KEY,
    baseUrl: env.SHANK_API_BASE_URL,
  },
  bundleportal: {
    apiKey: env.BUNDLE_PORTAL_API_KEY,
    baseUrl: env.BUNDLE_PORTAL_API_BASE_URL,
  },
};

const keyName = (provider: ProviderCode, field: 'apiKey' | 'baseUrl') =>
  `provider.${provider}.${field}`;

const encryptionKey = crypto.createHash('sha256').update(env.JWT_SECRET).digest();
const ENCRYPTED_PREFIX = 'enc:v1:';

const encrypt = (value: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
};

const decrypt = (value: string): string => {
  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    // Backwards compatibility if a credential was saved before encryption was introduced.
    return value;
  }

  const [ivEncoded, authTagEncoded, ciphertextEncoded] = value
    .slice(ENCRYPTED_PREFIX.length)
    .split(':');

  if (!ivEncoded || !authTagEncoded || !ciphertextEncoded) {
    throw new Error('Stored provider credential is invalid');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey,
    Buffer.from(ivEncoded, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(authTagEncoded, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, 'base64')),
    decipher.final(),
  ]).toString('utf8');
};

const maskApiKey = (apiKey: string): string => {
  if (!apiKey) return '';
  if (apiKey.length <= 8) return '••••••••';
  return `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}`;
};

export const getProviderCredentials = async (
  provider: ProviderCode,
): Promise<ProviderCredentials> => {
  const [apiKeySetting, baseUrlSetting] = await Promise.all([
    prisma.adminSettings.findUnique({ where: { key: keyName(provider, 'apiKey') } }),
    prisma.adminSettings.findUnique({ where: { key: keyName(provider, 'baseUrl') } }),
  ]);

  const databaseApiKey = apiKeySetting?.value ? decrypt(apiKeySetting.value).trim() : '';
  const environmentApiKey = PROVIDER_DEFAULTS[provider].apiKey?.trim() || '';

  return {
    apiKey: databaseApiKey || environmentApiKey,
    baseUrl: baseUrlSetting?.value.trim() || PROVIDER_DEFAULTS[provider].baseUrl,
    source: databaseApiKey ? 'database' : environmentApiKey ? 'environment' : 'none',
  };
};

export const getProviderCredentialSummaries = async () => {
  const [shank, bundleportal] = await Promise.all([
    getProviderCredentials('shank'),
    getProviderCredentials('bundleportal'),
  ]);

  return {
    shank: {
      configured: Boolean(shank.apiKey),
      apiKeyMasked: maskApiKey(shank.apiKey),
      baseUrl: shank.baseUrl,
      source: shank.source,
    },
    bundleportal: {
      configured: Boolean(bundleportal.apiKey),
      apiKeyMasked: maskApiKey(bundleportal.apiKey),
      baseUrl: bundleportal.baseUrl,
      source: bundleportal.source,
    },
  };
};

export const saveProviderCredentials = async (
  provider: ProviderCode,
  values: { apiKey?: string; baseUrl: string },
): Promise<void> => {
  const operations = [
    prisma.adminSettings.upsert({
      where: { key: keyName(provider, 'baseUrl') },
      update: { value: values.baseUrl.trim().replace(/\/$/, '') },
      create: {
        key: keyName(provider, 'baseUrl'),
        value: values.baseUrl.trim().replace(/\/$/, ''),
      },
    }),
  ];

  const apiKey = values.apiKey?.trim();
  if (apiKey) {
    operations.push(
      prisma.adminSettings.upsert({
        where: { key: keyName(provider, 'apiKey') },
        update: { value: encrypt(apiKey) },
        create: { key: keyName(provider, 'apiKey'), value: encrypt(apiKey) },
      }),
    );
  }

  await prisma.$transaction(operations);
};
