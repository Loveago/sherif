export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DATABASE_URL) {
    const { startProviderSyncPoller } = await import("./lib/provider-apis/poller");
    startProviderSyncPoller();
  }
}
