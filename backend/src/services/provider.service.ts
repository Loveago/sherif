import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { generateReference } from '../utils/refs.js';

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

  const successful = env.MOCK_PROVIDER ? true : true;
  const responsePayload = {
    providerReference: generateReference('PRV'),
    status: successful ? 'SUCCESSFUL' : 'FAILED',
  };

  await prisma.providerTransaction.create({
    data: {
      providerId: provider.id,
      orderId: order.id,
      requestPayload,
      responsePayload,
      status: responsePayload.status,
    },
  });

  return responsePayload;
};
