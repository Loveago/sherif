import { runReconciliation, ReconciliationResult } from '../services/reconciler.service.js';
import { env } from '../config/env.js';

interface ReconcilerState {
  isEnabled: boolean;
  startAfter: Date | null;
  lastRunAt: Date | null;
  lastResult: ReconciliationResult | null;
  totalReconciled: number;
  totalFailed: number;
}

const RECONCILER_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

export const reconcilerState: ReconcilerState = {
  isEnabled: true,
  startAfter: null,
  lastRunAt: null,
  lastResult: null,
  totalReconciled: 0,
  totalFailed: 0,
};

let workerTimer: NodeJS.Timeout | null = null;

export const runReconcilerTick = async (): Promise<ReconciliationResult> => {
  if (!reconcilerState.isEnabled || !reconcilerState.startAfter) {
    return { checked: 0, reconciled: 0, failed: 0, skipped: 0 };
  }

  try {
    const result = await runReconciliation(reconcilerState.startAfter);
    reconcilerState.lastRunAt = new Date();
    reconcilerState.lastResult = result;
    reconcilerState.totalReconciled += result.reconciled;
    reconcilerState.totalFailed += result.failed;
    return result;
  } catch (error) {
    console.error('[ReconcilerWorker] Unexpected error during tick:', error);
    return { checked: 0, reconciled: 0, failed: 0, skipped: 0 };
  }
};

export const startPaymentReconciler = () => {
  if (workerTimer) {
    console.log('[ReconcilerWorker] Already running');
    return;
  }

  // Only track orders created from now onward; ignore all existing pending orders
  if (!reconcilerState.startAfter) {
    reconcilerState.startAfter = new Date();
  }

  const tick = async () => {
    await runReconcilerTick();
  };

  workerTimer = setInterval(tick, RECONCILER_INTERVAL_MS);

  // First run after 10 seconds
  setTimeout(tick, 10000);

  console.log(`[ReconcilerWorker] Started — polling every ${RECONCILER_INTERVAL_MS}ms (orders created after ${reconcilerState.startAfter.toISOString()})`);
};

export const stopPaymentReconciler = () => {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
    console.log('[ReconcilerWorker] Stopped');
  }
};

export const togglePaymentReconciler = (enabled: boolean) => {
  reconcilerState.isEnabled = enabled;
  if (enabled && !reconcilerState.startAfter) {
    reconcilerState.startAfter = new Date();
    console.log(`[ReconcilerWorker] Automation enabled — now tracking orders created after ${reconcilerState.startAfter.toISOString()}`);
  } else {
    console.log(`[ReconcilerWorker] Automation ${enabled ? 'enabled' : 'disabled'}`);
  }
};

export const getReconcilerStatus = () => {
  return {
    isEnabled: reconcilerState.isEnabled,
    isRunning: workerTimer !== null,
    startAfter: reconcilerState.startAfter,
    lastRunAt: reconcilerState.lastRunAt,
    lastResult: reconcilerState.lastResult,
    totalReconciled: reconcilerState.totalReconciled,
    totalFailed: reconcilerState.totalFailed,
  };
};
