import { UserRole, VerificationStatus, ReferralCodeStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { comparePassword, hashPassword, signToken } from '../utils/security.js';
import { createAuditLog } from './audit.service.js';

export const registerUser = async (payload: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  companyName?: string;
  referralCode?: string;
}) => {
  const existingUser = await prisma.user.findUnique({ where: { email: payload.email } });

  if (existingUser) {
    throw new Error('User already exists');
  }

  let referralCodeId: string | undefined;

  if (payload.referralCode) {
    const code = payload.referralCode.toUpperCase().trim();
    const referral = await prisma.referralCode.findUnique({ where: { code } });

    if (!referral) {
      throw new Error('Invalid referral code');
    }
    if (referral.status !== ReferralCodeStatus.ACTIVE) {
      throw new Error('Referral code is not active');
    }
    if (referral.expiresAt && new Date() > referral.expiresAt) {
      throw new Error('Referral code has expired');
    }
    if (referral.maxUses && referral.currentUses >= referral.maxUses) {
      throw new Error('Referral code has reached maximum uses');
    }
    if (referral.usedById) {
      throw new Error('Referral code has already been used');
    }

    referralCodeId = referral.id;
  }

  const passwordHash = await hashPassword(payload.password);
  const slug = `${payload.firstName}-${payload.lastName}`.toLowerCase().replace(/\s+/g, '-');

  const user = await prisma.user.create({
    data: {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      passwordHash,
      phone: payload.phone,
      companyName: payload.companyName,
      role: UserRole.AGENT,
      verificationStatus: VerificationStatus.VERIFIED,
      emailVerifiedAt: new Date(),
      wallet: {
        create: {
          availableBalance: 0,
          pendingBalance: 0,
        },
      },
      storefront: {
        create: {
          slug,
          displayName: `${payload.firstName} ${payload.lastName}`,
          tagline: 'Fast. Reliable. Affordable data.',
          description: 'Premium data bundle storefront for Ghanaian networks.',
          conversionRate: 0,
        },
      },
    },
    include: {
      wallet: true,
      storefront: true,
    },
  });

  if (referralCodeId) {
    await prisma.referralCode.update({
      where: { id: referralCodeId },
      data: {
        currentUses: { increment: 1 },
        usedById: user.id,
      },
    });
  }

  await createAuditLog(user.id, 'USER_REGISTERED', 'User', user.id, { email: user.email, referralCode: payload.referralCode });

  return {
    user,
    token: signToken({ userId: user.id, role: user.role }),
  };
};

export const loginUser = async (email: string, password: string, session: {
  ipAddress?: string;
  userAgent?: string;
}) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      wallet: true,
      storefront: true,
    },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isValid = await comparePassword(password, user.passwordHash);

  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  await prisma.session.create({
    data: {
      userId: user.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      deviceName: 'Web Browser',
    },
  });

  await createAuditLog(user.id, 'USER_LOGIN', 'User', user.id, { email: user.email });

  return {
    user,
    token: signToken({ userId: user.id, role: user.role }),
  };
};

export const getCurrentUser = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      wallet: true,
      storefront: true,
    },
  });
};
