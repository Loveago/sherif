import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
  });

  console.log(`Found ${products.length} products to migrate...`);

  for (const product of products) {
    // If dataSize exists and is not empty, use it as description
    const bundleSize = product.dataSize?.trim();
    const currentDesc = product.description?.trim();

    if (bundleSize && bundleSize.length > 0) {
      // Update: description = bundle size (dataSize), name stays as network
      await prisma.product.update({
        where: { id: product.id },
        data: {
          description: bundleSize,
          dataSize: '',
        },
      });
      console.log(`✓ ${product.name}: description → "${bundleSize}"`);
    } else if (!currentDesc || currentDesc.length === 0) {
      // If both are empty, set a default
      await prisma.product.update({
        where: { id: product.id },
        data: {
          description: '1GB',
        },
      });
      console.log(`✓ ${product.name}: description → "1GB" (default)`);
    } else {
      console.log(`- ${product.name}: already has description "${currentDesc}"`);
    }
  }

  console.log('\nMigration complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
