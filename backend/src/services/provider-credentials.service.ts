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

  let resolvedBaseUrl = baseUrlSetting?.value.trim() || PROVIDER_DEFAULTS[provider].baseUrl;
  if (provider === 'bundleportal' && resolvedBaseUrl.includes('/v1')) {
    resolvedBaseUrl = resolvedBaseUrl.replace('/v1', '/v2');
  }

  return {
    apiKey: databaseApiKey || environmentApiKey,
    baseUrl: resolvedBaseUrl,
    source: databaseApiKey ? 'database' : environmentApiKey ? 'environment' : 'none',
  };
};

export const getBundlePortalWebhookSecret = async (): Promise<string | undefined> => {
  const setting = await prisma.adminSettings.findUnique({
    where: { key: 'provider.bundleportal.webhookSecret' },
  });
  if (setting?.value) {
    try {
      return decrypt(setting.value).trim();
    } catch {
      return setting.value.trim();
    }
  }
  return env.BUNDLE_PORTAL_WEBHOOK_SECRET?.trim() || undefined;
};

export const saveBundlePortalWebhookSecret = async (secret: string): Promise<void> => {
  await prisma.adminSettings.upsert({
    where: { key: 'provider.bundleportal.webhookSecret' },
    update: { value: encrypt(secret.trim()) },
    create: { key: 'provider.bundleportal.webhookSecret', value: encrypt(secret.trim()) },
  });
};

export const getProviderCredentialSummaries = async () => {
  const [shank, bundleportal, bundlePortalWebhookSecret] = await Promise.all([
    getProviderCredentials('shank'),
    getProviderCredentials('bundleportal'),
    getBundlePortalWebhookSecret(),
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
      webhookConfigured: Boolean(bundlePortalWebhookSecret),
    },
  };
};

export const saveProviderCredentials = async (
  provider: ProviderCode,
  values: { apiKey?: string; baseUrl: string },
): Promise<void> => {
  let cleanBaseUrl = values.baseUrl.trim().replace(/\/$/, '');
  if (provider === 'bundleportal' && cleanBaseUrl.includes('/v1')) {
    cleanBaseUrl = cleanBaseUrl.replace('/v1', '/v2');
  }

  const operations = [
    prisma.adminSettings.upsert({
      where: { key: keyName(provider, 'baseUrl') },
      update: { value: cleanBaseUrl },
      create: {
        key: keyName(provider, 'baseUrl'),
        value: cleanBaseUrl,
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
