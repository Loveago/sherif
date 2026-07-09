import { prisma } from '../lib/prisma.js';
import { generateReference } from '../utils/refs.js';
import { shankClient } from './shank.service.js';
import { codecraftClient } from './codecraft.service.js';
import { dataSizeToVolumeMb, normalizeDataSize } from '../utils/shank-mapping.js';
import {
  isBigTimeProduct,
  isCodecraftNetwork,
  toCodecraftGig,
  toCodecraftNetwork,
  toCodecraftRecipient,
} from '../utils/codecraft-mapping.js';

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

const isCodecraftCreateSuccess = (createResponse: {
  status?: number | string;
  message?: string;
  reference_id?: string;
  referenceId?: string;
}): boolean => {
  const statusCode = Number(createResponse.status);
  if (statusCode === 200) return true;

  const statusText = String(createResponse.status ?? '').toLowerCase().trim();
  if (statusText === '200' || statusText === 'success' || statusText === 'successful') return true;

  const message = String(createResponse.message ?? '').toLowerCase();
  if (message.includes('order recorded') || message.includes('successful')) return true;

  // Some CodeCraft responses only return a reference without a useful status field
  if (createResponse.reference_id || createResponse.referenceId) {
    // Business error codes from docs: 100, 101, 102, 103, 500, 555
    if ([100, 101, 102, 103, 500, 555].includes(statusCode)) return false;
    if (!createResponse.status) return true;
  }

  return false;
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
  const codecraftNetwork = toCodecraftNetwork(networkCode);

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
  if (isCodecraftNetwork(networkCode)) {
    if (!codecraftClient.isConfigured()) {
      throw new Error('CODECRAFT_API_KEY is not configured for Telecel/AirtelTigo orders');
    }

    if (!codecraftNetwork) {
      throw new Error(`Cannot map network "${networkCode}" to a CodeCraft network`);
    }

    // BigTime channel is for AT (AirtelTigo) products whose name/description/slug includes "bigtime"
    const isBigTime =
      codecraftNetwork === 'AT' &&
      isBigTimeProduct(
        order.product.name,
        order.product.description,
        order.product.slug,
        order.product.dataSize,
      );

    // BigTime endpoint only accepts MTN | AT
    const bigTimeNetwork: 'MTN' | 'AT' = 'AT';

    const recipientNumber = toCodecraftRecipient(order.phoneNumber);
    const gig = toCodecraftGig({
      dataSize: order.product.dataSize || resolvedDataSize,
      description: order.product.description,
      name: order.product.name,
    });

    if (!gig) {
      throw new Error(
        `Cannot derive CodeCraft gig/package from product "${order.product.name}" (dataSize="${order.product.dataSize}", description="${order.product.description}")`,
      );
    }

    console.log(
      `[Provider] CodeCraft fulfill order=${order.receiptNumber} network=${codecraftNetwork} bigTime=${isBigTime} gig=${gig} phone=${recipientNumber}`,
    );

    try {
      const createResponse = isBigTime
        ? await codecraftClient.createBigTimeOrder(recipientNumber, gig, bigTimeNetwork)
        : await codecraftClient.createRegularOrder(recipientNumber, gig, codecraftNetwork);

      console.log(
        `[Provider] CodeCraft create response for ${order.receiptNumber}:`,
        JSON.stringify(createResponse),
      );

      const externalReference = createResponse.reference_id || createResponse.referenceId;
      if (!externalReference) {
        throw new Error(
          `CodeCraft did not return a reference_id for the order (status=${createResponse.status}, message=${createResponse.message || 'n/a'})`,
        );
      }

      const providerReference = externalReference;
      const ok = isCodecraftCreateSuccess(createResponse);
      const status = ok ? ('PROCESSING' as const) : ('FAILED' as const);

      if (!ok) {
        console.error(
          `[Provider] CodeCraft rejected order ${order.receiptNumber}: status=${createResponse.status} message=${createResponse.message || 'n/a'} bigTime=${isBigTime} gig=${gig}`,
        );
      }

      const responsePayload = {
        providerReference,
        externalReference,
        status,
        provider: 'CODECRAFT',
        isBigTime,
        codecraftNetwork: isBigTime ? bigTimeNetwork : codecraftNetwork,
        gig,
        recipientNumber,
        createResponse,
      };

      await prisma.providerTransaction.create({
        data: {
          providerId: provider.id,
          orderId: order.id,
          requestPayload: toJson({
            ...requestPayloadBase,
            codecraftNetwork: isBigTime ? bigTimeNetwork : codecraftNetwork,
            gig,
            isBigTime,
            recipientNumber,
            endpoint: isBigTime ? 'special.php' : 'initiate.php',
          }),
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
      console.error(
        `[Provider] Codecraft API error for ${order.receiptNumber} (bigTime=${isBigTime}, gig=${gig}, network=${codecraftNetwork}):`,
        errorMessage,
      );

      const failPayload = {
        providerReference: generateReference('PRV'),
        externalReference: null as string | null,
        status: 'FAILED' as const,
        error: errorMessage,
        provider: 'CODECRAFT',
        isBigTime,
        codecraftNetwork: isBigTime ? bigTimeNetwork : codecraftNetwork,
        gig,
        recipientNumber,
      };

      await prisma.providerTransaction.create({
        data: {
          providerId: provider.id,
          orderId: order.id,
          requestPayload: toJson({
            ...requestPayloadBase,
            codecraftNetwork: isBigTime ? bigTimeNetwork : codecraftNetwork,
            gig,
            isBigTime,
            recipientNumber,
            endpoint: isBigTime ? 'special.php' : 'initiate.php',
          }),
          responsePayload: toJson(failPayload),
          status: 'FAILED',
        },
      });

      return failPayload;
    }
  }

  throw new Error(`Unsupported network for provider fulfillment: ${networkCode}`);
};
