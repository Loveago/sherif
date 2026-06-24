import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { ensureSeed } from './lib/startup-seed.js';
import { startShankStatusWorker } from './workers/shank-status.worker.js';
import { startCodecraftStatusWorker } from './workers/codecraft-status.worker.js';
import { startPaymentReconciler } from './workers/payment-reconciler.worker.js';

const startServer = async () => {
  await prisma.$connect();
  await ensureSeed();

  app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
    startShankStatusWorker();
    startCodecraftStatusWorker();
    startPaymentReconciler();
  });
};

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
