import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { normalizePhoneNumber } from '@/lib/phone-utils';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { rawText } = body;

    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ error: 'rawText containing phone numbers is required' }, { status: 400 });
    }

    const lines = rawText.split(/[\r\n,]+/);
    let importedCount = 0;

    for (let line of lines) {
      const clean = line.trim();
      const norm = normalizePhoneNumber(clean);

      if (norm && norm.length === 10) {
        await prisma.acceptedMtnNumber.upsert({
          where: { normalizedNumber: norm },
          create: {
            number: clean,
            normalizedNumber: norm,
            source: 'IMPORT_FILE',
            verifiedBy: session.userId ? String(session.userId) : null,
          },
          update: {},
        });
        importedCount++;
      }
    }

    return NextResponse.json({ success: true, count: importedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Import failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { phoneNumbers } = body;

    if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json({ error: 'phoneNumbers array is required' }, { status: 400 });
    }

    const normalizedList = phoneNumbers.map((p) => normalizePhoneNumber(p)).filter(Boolean);

    await prisma.acceptedMtnNumber.deleteMany({
      where: {
        normalizedNumber: { in: normalizedList },
      },
    });

    return NextResponse.json({ success: true, deleted: normalizedList.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Deletion failed' }, { status: 500 });
  }
}
