import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { TskconnectClient, resolveTskconnectPackageId, generateTskconnectReference } from "@/lib/provider-apis/tskconnect";
import {
  BundlePortalClient,
  normalizeBundlePortalNetwork,
  generateBundlePortalReference,
} from "@/lib/provider-apis/bundle-portal";
import { getProviderRoutingConfig } from "@/lib/provider-apis/router";
import { handleRouteError, apiError } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { action, provider = "TSKCONNECT", recipient = "0241234567", gbAmount = 1, network = "MTN" } = body;

    const config = await getProviderRoutingConfig();

    if (action === "test_tskconnect_balance") {
      const client = new TskconnectClient({
        ...config.tskconnect,
        apiKey: body.apiKey || config.tskconnect.apiKey,
        baseUrl: body.baseUrl || config.tskconnect.baseUrl,
      });
      const balanceRes = await client.getBalance();
      return NextResponse.json({ success: true, balance: balanceRes.data, raw: balanceRes });
    }

    if (action === "test_tskconnect_verify") {
      const client = new TskconnectClient({
        ...config.tskconnect,
        apiKey: body.apiKey || config.tskconnect.apiKey,
        baseUrl: body.baseUrl || config.tskconnect.baseUrl,
      });
      const res = await client.verifyNumbers([recipient]);
      return NextResponse.json({ success: true, verification: res });
    }

    if (action === "test_tskconnect_packages") {
      const client = new TskconnectClient({
        ...config.tskconnect,
        apiKey: body.apiKey || config.tskconnect.apiKey,
        baseUrl: body.baseUrl || config.tskconnect.baseUrl,
      });
      const res = await client.getPackages(network);
      return NextResponse.json({ success: true, packages: res.data });
    }

    if (action === "test_bundleportal_balance") {
      const client = new BundlePortalClient({
        ...config.bundleportal,
        apiKey: body.apiKey || config.bundleportal.apiKey,
        baseUrl: body.baseUrl || config.bundleportal.baseUrl,
      });
      const balanceRes = await client.checkBalance();
      return NextResponse.json({ success: true, balance: balanceRes.data, raw: balanceRes });
    }

    if (action === "test_bundleportal_verify") {
      const client = new BundlePortalClient({
        ...config.bundleportal,
        apiKey: body.apiKey || config.bundleportal.apiKey,
        baseUrl: body.baseUrl || config.bundleportal.baseUrl,
      });
      const bpNet = normalizeBundlePortalNetwork(network, body.mtnRoute || config.bundleportal.mtnRoute);
      const res = await client.verifyNumber(bpNet, recipient);
      return NextResponse.json({ success: true, verification: res.data, raw: res });
    }

    if (action === "test_bundleportal_bundles") {
      const client = new BundlePortalClient({
        ...config.bundleportal,
        apiKey: body.apiKey || config.bundleportal.apiKey,
        baseUrl: body.baseUrl || config.bundleportal.baseUrl,
      });
      const bpNet = normalizeBundlePortalNetwork(network, body.mtnRoute || config.bundleportal.mtnRoute);
      const res = await client.getBundles(bpNet);
      return NextResponse.json({ success: true, bundles: res.data?.bundles || [], count: res.data?.count ?? 0 });
    }

    if (action === "test_bundleportal_set_webhook") {
      const webhookUrl = String(body.webhookUrl || "").trim();
      if (!webhookUrl.startsWith("https://")) {
        return apiError(400, "Webhook URL must start with https://");
      }
      const client = new BundlePortalClient({
        ...config.bundleportal,
        apiKey: body.apiKey || config.bundleportal.apiKey,
        baseUrl: body.baseUrl || config.bundleportal.baseUrl,
      });
      const res = await client.setWebhook(webhookUrl);
      const newSecret = res.data?.webhook_secret || "";
      if (newSecret) {
        await prisma.systemSetting.upsert({
          where: { key: "bundleportal_webhook_secret" },
          update: { value: newSecret },
          create: { key: "bundleportal_webhook_secret", value: newSecret },
        });
      }
      return NextResponse.json({
        success: true,
        webhookUrl: res.data?.webhook_url || webhookUrl,
        webhookSecret: newSecret || undefined,
        events: res.data?.events || [],
      });
    }

    if (action === "test_order") {
      if (provider === "TSKCONNECT") {
        const client = new TskconnectClient({
          ...config.tskconnect,
          apiKey: body.apiKey || config.tskconnect.apiKey,
          baseUrl: body.baseUrl || config.tskconnect.baseUrl,
        });
        const packageId = resolveTskconnectPackageId(network, gbAmount);
        const reference = generateTskconnectReference(`TEST-${Date.now()}`);
        const order = await client.submitOrder({
          network,
          packageId,
          recipient,
          reference,
          idempotencyKey: reference,
        });
        return NextResponse.json({ success: true, provider: "TSKCONNECT", order });
      }

      if (provider === "BUNDLEPORTAL") {
        const client = new BundlePortalClient({
          ...config.bundleportal,
          apiKey: body.apiKey || config.bundleportal.apiKey,
          baseUrl: body.baseUrl || config.bundleportal.baseUrl,
        });
        const bpNet = normalizeBundlePortalNetwork(network, config.bundleportal.mtnRoute);
        const reference = generateBundlePortalReference(`TEST-${Date.now()}`);
        const order = await client.placeOrder({
          network: bpNet,
          recipient,
          package_size: gbAmount,
          order_id: reference,
        });
        return NextResponse.json({ success: true, provider: "BUNDLEPORTAL", order });
      }

      return apiError(400, "Unsupported provider for test order");
    }

    return apiError(400, `Unknown action: ${action}`);
  } catch (err: any) {
    return handleRouteError(err);
  }
}
