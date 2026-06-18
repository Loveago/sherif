import { prisma } from '../lib/prisma.js';
import { generateReference } from '../utils/refs.js';
import { shankClient } from './shank.service.js';
import { dataSizeToVolumeMb, mapNetworkCodeToShankId } from '../utils/shank-mapping.js';

const toJson = (value: unknown) => JSON.parse(JSON.stringify(value));

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

  const requestPayload = {
    phoneNumber: order.phoneNumber,
    network: order.product.network.code,
    bundle: order.product.dataSize,
    amount: order.amount.toNumber(),
  };

  if (!shankClient.isConfigured()) {
    console.warn('[Provider] SHANK_API_KEY not set, using mock fulfillment');
    const mockResponsePayload = {
      providerReference: generateReference('PRV'),
      externalReference: null as string | null,
      status: 'SUCCESSFUL' as const,
    };

    await prisma.providerTransaction.create({
      data: {
        providerId: provider.id,
        orderId: order.id,
        requestPayload: toJson(requestPayload),
        responsePayload: toJson(mockResponsePayload),
        status: mockResponsePayload.status,
      },
    });

    return mockResponsePayload;
  }

  const network = order.product.network;
  const shankNetworkId = network.shankNetworkId ?? mapNetworkCodeToShankId(network.code);

  if (!shankNetworkId) {
    throw new Error(`No Shank network ID mapping for network "${network.code}"`);
  }

  const volumeMb = dataSizeToVolumeMb(order.product.dataSize);

  try {
    const shankResponse = await shankClient.submitOrder(shankNetworkId, order.phoneNumber, volumeMb);

    const orderItem = shankResponse.orders[0];
    const externalReference = shankResponse.reference;
    const providerReference = orderItem?.order_code || generateReference('PRV');

    const status = shankResponse.success && orderItem?.status === 'accepted'
      ? 'SUCCESSFUL'
      : 'FAILED';

    const responsePayload = {
      providerReference,
      externalReference,
      status,
      shankResponse,
    };

    await prisma.providerTransaction.create({
      data: {
        providerId: provider.id,
        orderId: order.id,
        requestPayload: toJson({ ...requestPayload, shankNetworkId, volumeMb }),
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
    console.error('[Provider] Shank API error:', errorMessage);

    const failPayload = {
      providerReference: generateReference('PRV'),
      externalReference: null,
      status: 'FAILED' as const,
      error: errorMessage,
    };

    await prisma.providerTransaction.create({
      data: {
        providerId: provider.id,
        orderId: order.id,
        requestPayload: toJson({ ...requestPayload, shankNetworkId, volumeMb }),
        responsePayload: toJson(failPayload),
        status: 'FAILED',
      },
    });

    return failPayload;
  }
};
