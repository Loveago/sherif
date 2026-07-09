import { prisma } from '../lib/prisma.js';
import { generateReference } from '../utils/refs.js';
import { shankClient } from './shank.service.js';
import { codecraftClient } from './codecraft.service.js';
import { dataSizeToVolumeMb, mapNetworkCodeToShankId, normalizeDataSize } from '../utils/shank-mapping.js';

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

const isAtBigTimeProduct = (name: string, description: string): boolean => {
  const haystack = `${name} ${description}`.toLowerCase();
  return (
    haystack.includes('bigtime') ||
    haystack.includes('big time') ||
    haystack.includes('big-time')
  );
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

  // When no external provider is configured, behave as instant success (mock)
  if (!shankClient.isConfigured() && !codecraftClient.isConfigured()) {
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

  // MTN stays on Shank as primary provider
  if (networkCode === 'MTN') {
    if (!shankClient.isConfigured()) {
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
          data: { externalReference },
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

  // Telecel & AirtelTigo go through Codecraft
  if (networkCode === 'TELECEL' || networkCode === 'AIRTELTIGO') {
    if (!codecraftClient.isConfigured()) {
      throw new Error('CODECRAFT_API_KEY is not configured for Telecel/AirtelTigo orders');
    }

    const isAt = networkCode === 'AIRTELTIGO';
    const isBigTime = isAt && isAtBigTimeProduct(order.product.name, order.product.description);

    // Map internal networks to Codecraft network strings
    const codecraftNetwork: 'MTN' | 'AT' | 'TELECEL' = isAt ? 'AT' : 'TELECEL';

    // Derive Codecraft gig from our dataSize (e.g. 1GB -> "1", 500MB -> "500")
    const normalized = normalizeDataSize(resolvedDataSize); // e.g. "1GB" or "500MB"
    const digits = normalized.replace(/\D/g, '');
    const gig = digits || resolvedDataSize;

    try {
      const createResponse = isBigTime
        ? await codecraftClient.createBigTimeOrder(order.phoneNumber, gig, codecraftNetwork === 'AT' ? 'AT' : 'MTN')
        : await codecraftClient.createRegularOrder(order.phoneNumber, gig, codecraftNetwork);

      const externalReference = createResponse.reference_id || createResponse.referenceId;
      if (!externalReference) {
        throw new Error('CodeCraft did not return a reference_id for the order');
      }
      const providerReference = externalReference || generateReference('PRV');

      const statusCode = Number(createResponse.status);
      const status = statusCode === 200 || createResponse.status === '200' || createResponse.status === 'success'
        ? 'PROCESSING' as const
        : 'FAILED' as const;

      const responsePayload = {
        providerReference,
        externalReference,
        status,
        provider: 'CODECRAFT',
        isBigTime,
        codecraftNetwork,
        gig,
        createResponse,
      };

      await prisma.providerTransaction.create({
        data: {
          providerId: provider.id,
          orderId: order.id,
          requestPayload: toJson({ ...requestPayloadBase, codecraftNetwork, gig, isBigTime }),
          responsePayload: toJson(responsePayload),
          status,
        },
      });

      await prisma.order.update({
        where: { id: orderId },
        data: { externalReference },
      });

      return { providerReference, externalReference, status };
    } catch (error) {
      const errorMessage = codecraftClient.getErrorMessage(error);
      console.error('[Provider] Codecraft API error:', errorMessage);

      const failPayload = {
        providerReference: generateReference('PRV'),
        externalReference: null as string | null,
        status: 'FAILED' as const,
        error: errorMessage,
        provider: 'CODECRAFT',
        isBigTime,
        codecraftNetwork,
        gig,
      };

      await prisma.providerTransaction.create({
        data: {
          providerId: provider.id,
          orderId: order.id,
          requestPayload: toJson({ ...requestPayloadBase, codecraftNetwork, gig, isBigTime }),
          responsePayload: toJson(failPayload),
          status: 'FAILED',
        },
      });

      return failPayload;
    }
  }

  throw new Error(`Unsupported network for provider fulfillment: ${networkCode}`);
};
