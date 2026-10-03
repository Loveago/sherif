import { prisma } from '../lib/prisma.js';
import { generateReference } from '../utils/refs.js';
import { shankClient } from './shank.service.js';
import {
  bundlePortalClient,
  isRetryableBundlePortalError,
  BundlePortalError,
  type BundlePortalNetwork,
} from './bundle-portal.service.js';
import {
  tskconnectClient,
  isRetryableTskconnectError,
  TskconnectError,
  type TskconnectNetwork,
  type TskconnectOrder,
} from './tskconnect.service.js';
import { dataSizeToVolumeMb, normalizeDataSize } from '../utils/shank-mapping.js';
import {
  isBundlePortalNetwork,
  toProviderNetwork,
  normalizeProviderRecipient,
} from '../utils/provider-mapping.js';

const toJson = (value: unknown) => JSON.parse(JSON.stringify(value));

const resolveDataSize = (dataSize: string, description: string, name: string): string => {
  if (dataSize && dataSize.trim()) return dataSize;
  return normalizeDataSize(description || name);
};

const getShankNetworkCandidates = (networkCode: string, configuredId?: number | null): number[] => {
  const fallbackMap: Record<string, number[]> = {
    MTN: [3],
    TELECEL: [2],
    AIRTELTIGO: [1, 4],
  };

  const defaults = fallbackMap[networkCode.toUpperCase()] || [];
  if (configuredId) {
    return [configuredId, ...defaults.filter((id) => id !== configuredId)];
  }
  return defaults;
};

const isScopeError = (message: string): boolean => {
  const lower = message.toLowerCase();
  return lower.includes('network not in api key scopes') || lower.includes('not in scope');
};

export const isInsufficientBalanceError = (message: string | null | undefined): boolean => {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('insufficient balance') ||
    lower.includes('insufficient funds') ||
    lower.includes('not enough balance') ||
    lower.includes('low balance') ||
    lower.includes('balance too low') ||
    lower.includes('wallet balance')
  );
};

export type MtnProviderChoice = 'shank' | 'bundleportal' | 'tskconnect';
export type OtherNetworksProviderChoice = 'bundleportal' | 'tskconnect';

/** AdminSettings key that controls which provider fulfills MTN orders. */
export const MTN_PROVIDER_SETTING_KEY = 'mtnProvider';

/** AdminSettings key that controls which provider fulfills Telecel and AirtelTigo orders. */
export const OTHER_NETWORKS_PROVIDER_SETTING_KEY = 'otherNetworksProvider';

/**
 * Read the admin-controlled MTN routing preference.
 * Defaults to Shank; accepts 'bundleportal', 'tskconnect', or 'shank'.
 */
export const resolveMtnProvider = async (): Promise<MtnProviderChoice> => {
  const setting = await prisma.adminSettings.findUnique({ where: { key: MTN_PROVIDER_SETTING_KEY } });
  if (setting?.value === 'bundleportal') return 'bundleportal';
  if (setting?.value === 'tskconnect') return 'tskconnect';
  return 'shank';
};

/**
 * Read the admin-controlled Non-MTN (Telecel & AirtelTigo) routing preference.
 * Defaults to Bundle Portal; accepts 'bundleportal' or 'tskconnect'.
 */
export const resolveOtherNetworksProvider = async (): Promise<OtherNetworksProviderChoice> => {
  const setting = await prisma.adminSettings.findUnique({ where: { key: OTHER_NETWORKS_PROVIDER_SETTING_KEY } });
  if (setting?.value === 'tskconnect') return 'tskconnect';
  return 'bundleportal';
};

/**
 * Collect order IDs whose fulfillment went through Bundle Portal (marked in the
 * ProviderTransaction response payload).
 */
export const getBundlePortalFulfilledOrderIds = async (orderIds: string[]): Promise<Set<string>> => {
  const fulfilled = new Set<string>();
  if (orderIds.length === 0) return fulfilled;

  const transactions = await prisma.providerTransaction.findMany({
    where: { orderId: { in: orderIds } },
    select: { orderId: true, responsePayload: true },
  });

  for (const tx of transactions) {
    if (!tx.orderId) continue;
    const payload = tx.responsePayload as Record<string, unknown> | null;
    if (payload && typeof payload === 'object' && payload.provider === 'BUNDLE_PORTAL') {
      fulfilled.add(tx.orderId);
    }
  }

  return fulfilled;
};

/**
 * Collect order IDs whose fulfillment went through Tskconnect (marked in the
 * ProviderTransaction response payload). Status workers use this to avoid polling
 * orders handled by other providers.
 */
export const getTskconnectFulfilledOrderIds = async (orderIds: string[]): Promise<Set<string>> => {
  const fulfilled = new Set<string>();
  if (orderIds.length === 0) return fulfilled;

  const transactions = await prisma.providerTransaction.findMany({
    where: { orderId: { in: orderIds } },
    select: { orderId: true, responsePayload: true },
  });

  for (const tx of transactions) {
    if (!tx.orderId) continue;
    const payload = tx.responsePayload as Record<string, unknown> | null;
    if (payload && typeof payload === 'object' && payload.provider === 'TSKCONNECT') {
      fulfilled.add(tx.orderId);
    }
  }

  return fulfilled;
};

export const fulfillOrderWithProvider = async (orderId: string) => {
  const provider = await prisma.provider.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { priority: 'asc' },
  });

  if (!provider) {
    throw new Error('No active provider configured');
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      product: { include: { network: true } },
      user: true,
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  const resolvedDataSize = resolveDataSize(
    order.product.dataSize,
    order.product.description,
    order.product.name,
  );

  const requestPayloadBase = {
    phoneNumber: order.phoneNumber,
    network: order.product.network.code,
    bundle: resolvedDataSize,
    amount: order.amount.toNumber(),
  };

  const networkCode = order.product.network.code.toUpperCase();
  const bundlePortalNetworkCode = toProviderNetwork(networkCode);

  const [mtnChoice, otherChoice] = await Promise.all([
    resolveMtnProvider(),
    resolveOtherNetworksProvider(),
  ]);

  const [shankConfigured, bundlePortalConfigured, tskconnectConfigured] = await Promise.all([
    shankClient.isConfigured(),
    bundlePortalClient.isConfigured(),
    tskconnectClient.isConfigured(),
  ]);

  // When no external provider is configured, behave as instant success (mock)
  if (!shankConfigured && !bundlePortalConfigured && !tskconnectConfigured) {
    console.warn('[Provider] No external provider API configured, using mock fulfillment');
    const mockResponsePayload = {
      providerReference: generateReference('PRV'),
      externalReference: null as string | null,
      status: 'SUCCESSFUL' as const,
    };

    await prisma.providerTransaction.create({
      data: {
        providerId: provider.id,
        orderId: order.id,
        requestPayload: toJson(requestPayloadBase),
        responsePayload: toJson(mockResponsePayload),
        status: mockResponsePayload.status,
      },
    });

    return mockResponsePayload;
  }

  // Tskconnect fulfillment (when selected for MTN or for Telecel/AirtelTigo)
  const useTskconnectForThisOrder =
    (networkCode === 'MTN' && mtnChoice === 'tskconnect') ||
    (networkCode !== 'MTN' && otherChoice === 'tskconnect');

  if (useTskconnectForThisOrder) {
    if (!tskconnectConfigured) {
      throw new Error(`TSKCONNECT_API_KEY is not configured for ${networkCode} orders`);
    }

    const tskNetwork: TskconnectNetwork =
      networkCode === 'MTN'
        ? 'MTN'
        : bundlePortalNetworkCode === 'AT'
          ? 'AIRTELTIGO'
          : 'TELECEL';

    const recipientNumber = normalizeProviderRecipient(order.phoneNumber);
    const normalizedSize = (order.product.dataSize || resolvedDataSize).toUpperCase().replace(/\s/g, '');
    const gbMatch = normalizedSize.match(/(\d+(?:\.\d+)?)GB/);
    const mbMatch = normalizedSize.match(/(\d+(?:\.\d+)?)MB/);
    const packageSizeGb = gbMatch ? Number(gbMatch[1]) : mbMatch ? Number(mbMatch[1]) / 1000 : Number(normalizedSize);

    if (!Number.isFinite(packageSizeGb) || packageSizeGb <= 0) {
      throw new Error(`Cannot derive Tskconnect package size from "${normalizedSize}"`);
    }

    try {
      if (tskNetwork === 'MTN') {
        try {
          const verifyRes = await tskconnectClient.verifyNumbers([recipientNumber], 'MTN');
          const item = verifyRes.results?.[0];
          if (item && item.canOrder === false) {
            throw new TskconnectError(
              item.note || 'This MTN number is not verified in provider database. Ordering cannot proceed.',
              'UNVERIFIED_NUMBER',
              400,
            );
          }
        } catch (vErr) {
          if (vErr instanceof TskconnectError && vErr.code === 'UNVERIFIED_NUMBER') {
            throw vErr;
          }
        }
      }

      const packageId = await tskconnectClient.resolvePackageId(tskNetwork, packageSizeGb);

      const MAX_PLACE_ATTEMPTS = 3;
      let orderResponse: TskconnectOrder | undefined;
      let lastError: unknown;

      for (let attempt = 1; attempt <= MAX_PLACE_ATTEMPTS; attempt++) {
        try {
          orderResponse = await tskconnectClient.placeOrder(
            tskNetwork,
            packageId,
            recipientNumber,
            order.receiptNumber,
            order.receiptNumber,
          );
          lastError = undefined;
          break;
        } catch (error) {
          lastError = error;
          const retryable = isRetryableTskconnectError(error);
          console.warn(
            `[Provider] Tskconnect placeOrder attempt ${attempt}/${MAX_PLACE_ATTEMPTS} failed:`,
            tskconnectClient.getErrorMessage(error),
          );
          if (!retryable) {
            throw error;
          }
          if (attempt < MAX_PLACE_ATTEMPTS) {
            await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
          }
        }
      }

      if (!orderResponse) {
        throw lastError;
      }

      const externalReference = orderResponse.reference || orderResponse.orderId || order.receiptNumber;
      const providerReference = orderResponse.orderId || generateReference('PRV');
      const status =
        orderResponse.status === 'COMPLETED' || orderResponse.status === 'TEST_COMPLETED'
          ? ('SUCCESSFUL' as const)
          : orderResponse.status === 'FAILED'
            ? ('FAILED' as const)
            : ('PROCESSING' as const);

      const responsePayload = {
        providerReference,
        externalReference,
        status,
        provider: 'TSKCONNECT',
        tskNetwork,
        packageId,
        packageSizeGb,
        orderResponse,
      };

      await prisma.providerTransaction.create({
        data: {
          providerId: provider.id,
          orderId: order.id,
          requestPayload: toJson({
            ...requestPayloadBase,
            tskNetwork,
            packageId,
            packageSizeGb,
            recipientNumber,
            provider: 'TSKCONNECT',
          }),
          responsePayload: toJson(responsePayload),
          status,
        },
      });

      await prisma.order.update({
        where: { id: orderId },
        data: { externalReference, providerReference },
      });

      return { providerReference, externalReference, status };
    } catch (error) {
      const errorMessage = tskconnectClient.getErrorMessage(error);

      if (isRetryableTskconnectError(error)) {
        const deferredPayload = {
          providerReference: generateReference('PRV'),
          externalReference: order.receiptNumber as string | null,
          status: 'PROCESSING' as const,
          error: errorMessage,
          retryable: true,
          provider: 'TSKCONNECT',
          tskNetwork,
          packageSizeGb,
          recipientNumber,
        };

        await prisma.providerTransaction.create({
          data: {
            providerId: provider.id,
            orderId: order.id,
            requestPayload: toJson({
              ...requestPayloadBase,
              tskNetwork,
              packageSizeGb,
              recipientNumber,
              provider: 'TSKCONNECT',
            }),
            responsePayload: toJson(deferredPayload),
            status: 'PROCESSING',
          },
        });

        await prisma.order.update({
          where: { id: orderId },
          data: { externalReference: order.receiptNumber },
        });

        return deferredPayload;
      }

      const failPayload = {
        providerReference: generateReference('PRV'),
        externalReference: null as string | null,
        status: 'FAILED' as const,
        error: errorMessage,
        provider: 'TSKCONNECT',
        tskNetwork,
        packageSizeGb,
        recipientNumber,
      };

      await prisma.providerTransaction.create({
        data: {
          providerId: provider.id,
          orderId: order.id,
          requestPayload: toJson({
            ...requestPayloadBase,
            tskNetwork,
            packageSizeGb,
            recipientNumber,
            provider: 'TSKCONNECT',
          }),
          responsePayload: toJson(failPayload),
          status: 'FAILED',
        },
      });

      return failPayload;
    }
  }

  // MTN is fulfilled by Shank unless the admin routing toggle selects Bundle Portal or Tskconnect
  if (networkCode === 'MTN' && mtnChoice === 'shank') {
    if (!shankConfigured) {
      throw new Error('SHANK_API_KEY is not configured for MTN orders');
    }

    const network = order.product.network;
    const networkCandidates = getShankNetworkCandidates(network.code, network.shankNetworkId);

    if (networkCandidates.length === 0) {
      throw new Error(`No Shank network ID mapping for network "${network.code}"`);
    }

    const volumeMb = dataSizeToVolumeMb(resolvedDataSize);

    for (const [index, shankNetworkId] of networkCandidates.entries()) {
      const isLast = index === networkCandidates.length - 1;
      const idempotencyKey = `cheappacks-${order.receiptNumber}-${shankNetworkId}`;

      try {
        const shankResponse = await shankClient.submitOrder(
          shankNetworkId,
          order.phoneNumber,
          volumeMb,
          idempotencyKey,
        );

        const orderItem = shankResponse.orders[0];
        const externalReference = shankResponse.reference;
        const providerReference = orderItem?.order_code || generateReference('PRV');

        const status = shankResponse.success && orderItem?.status === 'accepted'
          ? 'PROCESSING'
          : 'FAILED';

        const responsePayload = {
          providerReference,
          externalReference,
          status,
          shankNetworkId,
          shankResponse,
        };

        await prisma.providerTransaction.create({
          data: {
            providerId: provider.id,
            orderId: order.id,
            requestPayload: toJson({ ...requestPayloadBase, shankNetworkId, volumeMb }),
            responsePayload: toJson(responsePayload),
            status,
          },
        });

        await prisma.order.update({
          where: { id: orderId },
          data: {
            externalReference,
            providerReference,
          },
        });

        return { providerReference, externalReference, status };
      } catch (error) {
        const errorMessage = shankClient.getErrorMessage(error);
        console.error(`[Provider] Shank API error for networkId ${shankNetworkId}:`, errorMessage);

        if (isLast || !isScopeError(errorMessage)) {
          const failPayload = {
            providerReference: generateReference('PRV'),
            externalReference: null,
            status: 'FAILED' as const,
            error: errorMessage,
            attemptedNetworkIds: networkCandidates.slice(0, index + 1),
          };

          await prisma.providerTransaction.create({
            data: {
              providerId: provider.id,
              orderId: order.id,
              requestPayload: toJson({
                ...requestPayloadBase,
                shankNetworkId,
                volumeMb,
                attemptedNetworkIds: networkCandidates.slice(0, index + 1),
              }),
              responsePayload: toJson(failPayload),
              status: 'FAILED',
            },
          });

          return failPayload;
        }

        console.log(`[Provider] Retrying order ${orderId} with fallback network ID...`);
      }
    }
  }

  // Telecel and AirtelTigo default to Bundle Portal unless routed to Tskconnect;
  // MTN joins them when the admin routing toggle selects Bundle Portal.
  const useBundlePortalForMtn = networkCode === 'MTN' && mtnChoice === 'bundleportal';
  const useBundlePortalForOther = isBundlePortalNetwork(networkCode) && otherChoice === 'bundleportal';

  if (useBundlePortalForOther || useBundlePortalForMtn) {
    const bundlePortalConfigured = await bundlePortalClient.isConfigured();
    if (!bundlePortalConfigured) {
      throw new Error(`BUNDLE_PORTAL_API_KEY is not configured for ${networkCode} orders`);
    }

    const bundlePortalNetwork: BundlePortalNetwork =
      networkCode === 'MTN'
        ? 'mtn'
        : bundlePortalNetworkCode === 'AT'
          ? 'airteltigo'
          : 'telecel';
    const recipientNumber = normalizeProviderRecipient(order.phoneNumber);
    const normalizedSize = (order.product.dataSize || resolvedDataSize).toUpperCase().replace(/\s/g, '');
    const gbMatch = normalizedSize.match(/(\d+(?:\.\d+)?)GB/);
    const mbMatch = normalizedSize.match(/(\d+(?:\.\d+)?)MB/);
    const packageSizeGb = gbMatch ? Number(gbMatch[1]) : mbMatch ? Number(mbMatch[1]) / 1000 : Number(normalizedSize);

    if (!Number.isFinite(packageSizeGb) || packageSizeGb <= 0) {
      throw new Error(`Cannot derive Bundle Portal package size from "${normalizedSize}"`);
    }

    try {
      const verifyResponse = await bundlePortalClient.verifyNumber(bundlePortalNetwork, recipientNumber);
      const verification = verifyResponse.data as {
        allowed?: boolean;
        can_order?: boolean;
        allowlist_message?: string | null;
        pending_order?: unknown;
      } | undefined;

      // 403 not_allowlisted — number still pending approval. No order was created
      // at Bundle Portal and retrying will not help, so this fails cleanly and the
      // automatic refund simply reverses the wallet debit.
      if (verification && verification.allowed === false) {
        throw new BundlePortalError(
          verification.allowlist_message ||
            'Recipient is not yet approved for this network. Please try again later.',
          'not_allowlisted',
        );
      }

      // can_order false — an earlier order for this number is still in flight:
      // defer, do not refund (retry-later semantics).
      if (!verification?.can_order) {
        throw new BundlePortalError(
          verifyResponse.message || 'Recipient has a pending order and cannot order again yet.',
          'pending_order',
        );
      }

      // Retry transient placement errors (409/429/503 etc.) with bounded attempts.
      // The order_id is idempotent, so a retry never double-charges.
      const MAX_PLACE_ATTEMPTS = 3;
      let createResponse: Awaited<ReturnType<typeof bundlePortalClient.placeOrder>> | undefined;
      let lastError: unknown;

      for (let attempt = 1; attempt <= MAX_PLACE_ATTEMPTS; attempt++) {
        try {
          createResponse = await bundlePortalClient.placeOrder(
            bundlePortalNetwork,
            recipientNumber,
            packageSizeGb,
            order.receiptNumber,
          );
          lastError = undefined;
          break;
        } catch (error) {
          lastError = error;
          const retryable = isRetryableBundlePortalError(error);
          console.warn(
            `[Provider] Bundle Portal placeOrder attempt ${attempt}/${MAX_PLACE_ATTEMPTS} failed:`,
            bundlePortalClient.getErrorMessage(error),
          );
          if (!retryable) {
            // Permanent rejection — surface immediately so the order fails cleanly.
            throw error;
          }
          if (attempt < MAX_PLACE_ATTEMPTS) {
            await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
          }
        }
      }

      if (!createResponse) {
        // All retries exhausted — defer to the status worker without refunding.
        throw lastError;
      }

      const externalReference = createResponse.data?.reference || createResponse.data?.order_id;
      if (!externalReference) throw new Error('Bundle Portal did not return an order reference');

      const providerReference = externalReference;
      const status = createResponse.data?.status === 'completed' ? 'SUCCESSFUL' as const : 'PROCESSING' as const;
      const responsePayload = { providerReference, externalReference, status, provider: 'BUNDLE_PORTAL', bundlePortalNetwork, packageSizeGb, createResponse };

      await prisma.providerTransaction.create({
        data: {
          providerId: provider.id,
          orderId: order.id,
          requestPayload: toJson({ ...requestPayloadBase, bundlePortalNetwork, packageSizeGb, recipientNumber, endpoint: '/v2' }),
          responsePayload: toJson(responsePayload),
          status,
        },
      });
      await prisma.order.update({ where: { id: orderId }, data: { externalReference, providerReference } });
      return { providerReference, externalReference, status };
    } catch (error) {
      const errorMessage = bundlePortalClient.getErrorMessage(error);

      // 409 pending_order / network_locked, 429, 503 order_capacity_busy and other
      // retry-later codes mean "try again", not "permanent failure". The status worker
      // keeps polling and the refund only happens if the provider eventually reports
      // failed. We persist the receipt number because check_status accepts our own
      // order_id as the order_reference, so the deferred order remains pollable.
      if (isRetryableBundlePortalError(error)) {
        const deferredPayload = {
          providerReference: generateReference('PRV'),
          externalReference: order.receiptNumber as string | null,
          status: 'PROCESSING' as const,
          error: errorMessage,
          retryable: true,
          provider: 'BUNDLE_PORTAL',
          bundlePortalNetwork,
          packageSizeGb,
          recipientNumber,
        };
        await prisma.providerTransaction.create({
          data: {
            providerId: provider.id,
            orderId: order.id,
            requestPayload: toJson({ ...requestPayloadBase, bundlePortalNetwork, packageSizeGb, recipientNumber, endpoint: '/v1' }),
            responsePayload: toJson(deferredPayload),
            status: 'PROCESSING',
          },
        });
        await prisma.order.update({
          where: { id: orderId },
          data: { externalReference: order.receiptNumber },
        });
        return deferredPayload;
      }

      const failPayload = { providerReference: generateReference('PRV'), externalReference: null as string | null, status: 'FAILED' as const, error: errorMessage, provider: 'BUNDLE_PORTAL', bundlePortalNetwork, packageSizeGb, recipientNumber };
      await prisma.providerTransaction.create({
        data: {
          providerId: provider.id,
          orderId: order.id,
          requestPayload: toJson({ ...requestPayloadBase, bundlePortalNetwork, packageSizeGb, recipientNumber, endpoint: '/v1' }),
          responsePayload: toJson(failPayload),
          status: 'FAILED',
        },
      });
      return failPayload;
    }
  }

  throw new Error(`Unsupported network for provider fulfillment: ${networkCode}`);
};
