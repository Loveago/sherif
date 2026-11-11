import assert from "assert";
import { prisma } from "../src/lib/prisma";
import {
  ensureUserAffiliateCode,
  distributeAffiliateCommissions,
  reverseAffiliateCommissions,
  requestAffiliateWithdrawal,
  approveAffiliateWithdrawal,
  rejectAffiliateWithdrawal,
  saveAgentAffiliatePricingSheet,
  getAgentAffiliateOverview,
  getAgentAffiliatePricingSheet,
} from "../src/lib/affiliate";
import { resolveUserWholesalePrice } from "../src/lib/orders";

async function runE2ETests() {
  console.log("==================================================================");
  console.log("🚀 Starting End-to-End Tests: Multi-Tier Affiliate & Wallet System");
  console.log("==================================================================\n");

  const timestamp = Date.now();
  const testUsers: string[] = [];
  const testOrders: number[] = [];
  const testPackages: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // Step 0: Ensure a base Pricing Profile and a DataPackage exist
    // -------------------------------------------------------------------------
    console.log("Step 0: Setting up test DataPackage and Platform Base Wholesale Pricing...");
    let testProfile = await prisma.pricingProfile.findFirst({
      where: { isDefault: true },
    });
    if (!testProfile) {
      testProfile = await prisma.pricingProfile.create({
        data: {
          name: `Test Profile ${timestamp}`,
          type: "RETAIL",
          isDefault: true,
          active: true,
        },
      });
    }

    // Create a unique test package (e.g. MTN 99GB test package)
    const testPkg = await prisma.dataPackage.create({
      data: {
        network: "MTN",
        name: `E2E Test MTN Bundle ${timestamp}`,
        gbAmount: 99.0 + (timestamp % 100) / 1000, // Unique gbAmount
        retailPriceGHS: 10.0, // Base platform cost = 10 GHS
        active: true,
      },
    });
    testPackages.push(testPkg.id);

    // Set tier price in profile
    await prisma.priceTier.upsert({
      where: {
        profileId_gbAmount: {
          profileId: testProfile.id,
          gbAmount: testPkg.gbAmount,
        },
      },
      update: { priceGHS: 10.0 },
      create: {
        profileId: testProfile.id,
        gbAmount: testPkg.gbAmount,
        priceGHS: 10.0,
      },
    });
    console.log(`   ✓ Test package created (${testPkg.name}) with base wholesale cost = GHS 10.00\n`);

    // -------------------------------------------------------------------------
    // Step 1: Create 3-Tier Agent Network
    // Root Agent -> Sub-Agent A -> Sub-Agent B
    // -------------------------------------------------------------------------
    console.log("Step 1: Provisioning 3-tier affiliate hierarchy (Root -> A -> B)...");
    
    // 1. Root Agent
    const rootAgent = await prisma.user.create({
      data: {
        name: `Root Agent ${timestamp}`,
        email: `root_${timestamp}@testaffiliate.com`,
        passwordHash: "hash",
        role: "RESELLER",
        status: "ACTIVE",
        balance: 100.0,
        affiliateBalance: 0.0,
      },
    });
    testUsers.push(rootAgent.id);
    const rootCode = await ensureUserAffiliateCode(rootAgent.id, rootAgent.name);
    console.log(`   ✓ Root Agent created with code: ${rootCode}`);

    // 2. Sub-Agent A (registers under Root Agent)
    const subAgentA = await prisma.user.create({
      data: {
        name: `Sub-Agent A ${timestamp}`,
        email: `agent_a_${timestamp}@testaffiliate.com`,
        passwordHash: "hash",
        role: "RESELLER",
        status: "ACTIVE",
        balance: 50.0,
        affiliateBalance: 0.0,
        referredById: rootAgent.id,
      },
    });
    testUsers.push(subAgentA.id);
    const agentACode = await ensureUserAffiliateCode(subAgentA.id, subAgentA.name);
    console.log(`   ✓ Sub-Agent A registered under Root Agent (code: ${agentACode})`);

    // 3. Sub-Agent B (registers under Sub-Agent A)
    const subAgentB = await prisma.user.create({
      data: {
        name: `Sub-Agent B ${timestamp}`,
        email: `agent_b_${timestamp}@testaffiliate.com`,
        passwordHash: "hash",
        role: "USER",
        status: "ACTIVE",
        balance: 50.0,
        affiliateBalance: 0.0,
        referredById: subAgentA.id,
      },
    });
    testUsers.push(subAgentB.id);
    console.log(`   ✓ Sub-Agent B registered under Sub-Agent A\n`);

    // Verify hierarchy links
    assert.strictEqual(subAgentB.referredById, subAgentA.id, "B must be referred by A");
    assert.strictEqual(subAgentA.referredById, rootAgent.id, "A must be referred by Root");
    assert.strictEqual(rootAgent.referredById, null, "Root must not have an upline");

    // -------------------------------------------------------------------------
    // Step 2: Configure Wholesale Price Sheets
    // Root sets Sub-Agent price = 12 GHS
    // Sub-Agent A sets Sub-Agent price = 13 GHS
    // -------------------------------------------------------------------------
    console.log("Step 2: Configuring customized wholesale price sheets...");
    
    // Root agent sets price for its direct sub-agents = 12 GHS (2 GHS margin)
    await saveAgentAffiliatePricingSheet(rootAgent.id, [
      { packageId: testPkg.id, priceGHS: 12.0 },
    ]);

    // Sub-Agent A sets price for its direct sub-agents = 13 GHS (1 GHS margin)
    await saveAgentAffiliatePricingSheet(subAgentA.id, [
      { packageId: testPkg.id, priceGHS: 13.0 },
    ]);

    // Verify wholesale price resolution:
    // Root pays base platform cost = 10 GHS
    const rootCost = await resolveUserWholesalePrice(rootAgent.id, testPkg);
    assert.strictEqual(rootCost, 10.0, `Root agent cost must be 10.00, got ${rootCost}`);

    // Sub-Agent A pays Root's configured price = 12 GHS
    const agentACost = await resolveUserWholesalePrice(subAgentA.id, testPkg);
    assert.strictEqual(agentACost, 12.0, `Sub-Agent A cost must be 12.00, got ${agentACost}`);

    // Sub-Agent B pays A's configured price = 13 GHS
    const agentBCost = await resolveUserWholesalePrice(subAgentB.id, testPkg);
    assert.strictEqual(agentBCost, 13.0, `Sub-Agent B cost must be 13.00, got ${agentBCost}`);

    console.log(`   ✓ Root Agent Wholesale Cost: GHS ${rootCost.toFixed(2)}`);
    console.log(`   ✓ Sub-Agent A Wholesale Cost: GHS ${agentACost.toFixed(2)}`);
    console.log(`   ✓ Sub-Agent B Wholesale Cost: GHS ${agentBCost.toFixed(2)}\n`);

    // -------------------------------------------------------------------------
    // Step 3: Order Execution & Cascading Multi-Tier Commission Test
    // Sub-Agent B buys at 13 GHS.
    // Expected:
    // - Sub-Agent A earns: 13 - 12 = 1.00 GHS (credited to affiliateBalance)
    // - Root Agent earns: 12 - 10 = 2.00 GHS (credited to affiliateBalance)
    // - Main operating wallet balances of A and Root remain UNTOUCHED!
    // -------------------------------------------------------------------------
    console.log("Step 3: Simulating order by Sub-Agent B and checking cascading commissions...");

    const order1 = await prisma.order.create({
      data: {
        userId: subAgentB.id,
        phoneNumber: "0241112233",
        network: "MTN",
        gbAmount: testPkg.gbAmount,
        packageId: testPkg.id,
        amount: 13.0,
        status: "PENDING",
        source: "WEB",
      },
    });
    testOrders.push(order1.id);

    // Run commission distribution inside a transaction
    const commissions = await prisma.$transaction(async (tx) => {
      return await distributeAffiliateCommissions(tx, {
        originOrderId: order1.id,
        userId: subAgentB.id,
        packageId: testPkg.id,
        gbAmount: testPkg.gbAmount,
        network: "MTN",
        amount: 13.0,
      });
    }, { maxWait: 15000, timeout: 30000 });

    assert.strictEqual(commissions.length, 2, "Must distribute across exactly 2 tiers");

    // Tier 1: Sub-Agent A
    const tier1 = commissions.find((c) => c.tierLevel === 1);
    assert.ok(tier1, "Tier 1 commission must exist");
    assert.strictEqual(tier1.beneficiaryId, subAgentA.id, "Tier 1 beneficiary must be Sub-Agent A");
    assert.strictEqual(tier1.amount, 1.0, `Tier 1 profit must be 1.00 GHS, got ${tier1.amount}`);

    // Tier 2: Root Agent
    const tier2 = commissions.find((c) => c.tierLevel === 2);
    assert.ok(tier2, "Tier 2 commission must exist");
    assert.strictEqual(tier2.beneficiaryId, rootAgent.id, "Tier 2 beneficiary must be Root Agent");
    assert.strictEqual(tier2.amount, 2.0, `Tier 2 profit must be 2.00 GHS, got ${tier2.amount}`);

    // Check balances in DB:
    const freshAgentA = await prisma.user.findUnique({ where: { id: subAgentA.id } });
    const freshRoot = await prisma.user.findUnique({ where: { id: rootAgent.id } });

    // Affiliate balances MUST be credited
    assert.strictEqual(freshAgentA?.affiliateBalance, 1.0, "Sub-Agent A affiliate balance must be 1.00 GHS");
    assert.strictEqual(freshRoot?.affiliateBalance, 2.0, "Root Agent affiliate balance must be 2.00 GHS");

    // Main operating balances MUST remain separate and untouched
    assert.strictEqual(freshAgentA?.balance, 50.0, "Sub-Agent A main balance must remain 50.00 GHS");
    assert.strictEqual(freshRoot?.balance, 100.0, "Root Agent main balance must remain 100.00 GHS");

    console.log(`   ✓ Tier 1 (Sub-Agent A) credited +GHS 1.00 to affiliate balance (main balance untouched)`);
    console.log(`   ✓ Tier 2 (Root Agent) credited +GHS 2.00 to affiliate balance (main balance untouched)\n`);

    // -------------------------------------------------------------------------
    // Step 4: Reversal on Order Cancellation / Refund Test
    // -------------------------------------------------------------------------
    console.log("Step 4: Testing affiliate commission reversal on order refund/cancellation...");
    
    const reversedAmount = await prisma.$transaction(async (tx) => {
      return await reverseAffiliateCommissions(tx, order1.id);
    }, { maxWait: 15000, timeout: 30000 });
    assert.strictEqual(reversedAmount, 3.0, "Total reversed commission must equal 3.00 GHS (1.00 + 2.00)");

    const afterRefundAgentA = await prisma.user.findUnique({ where: { id: subAgentA.id } });
    const afterRefundRoot = await prisma.user.findUnique({ where: { id: rootAgent.id } });

    assert.strictEqual(afterRefundAgentA?.affiliateBalance, 0.0, "Agent A affiliate balance must revert to 0");
    assert.strictEqual(afterRefundRoot?.affiliateBalance, 0.0, "Root affiliate balance must revert to 0");
    console.log("   ✓ Both tiers accurately reversed and debited from affiliate balance\n");

    // -------------------------------------------------------------------------
    // Step 5: Affiliate Wallet Withdrawals & Transfers
    // -------------------------------------------------------------------------
    console.log("Step 5: Testing Affiliate Wallet Withdrawals & Transfers...");

    // Fund Root Agent affiliate balance with 25 GHS
    await prisma.user.update({
      where: { id: rootAgent.id },
      data: { affiliateBalance: 25.0 },
    });

    // Test 5A: Instant Transfer to Main Operating Wallet
    console.log("   5A: Instant Transfer to Main Wallet...");
    const transferResult = await requestAffiliateWithdrawal(rootAgent.id, {
      amount: 10.0,
      payoutMethod: "MAIN_WALLET",
    });

    assert.strictEqual(transferResult.status, "APPROVED");
    assert.strictEqual(transferResult.payoutMethod, "MAIN_WALLET");
    assert.strictEqual(transferResult.amount, 10.0);

    const postTransferRoot = await prisma.user.findUnique({ where: { id: rootAgent.id } });
    assert.strictEqual(postTransferRoot?.affiliateBalance, 15.0, "Affiliate balance must decrease to 15.00");
    assert.strictEqual(postTransferRoot?.balance, 110.0, "Main operating balance must increase from 100.00 to 110.00");
    console.log("   ✓ Instant transfer succeeded: GHS 10.00 moved from affiliate to main wallet");

    // Test 5B: Mobile Money (MoMo) Payout Request
    console.log("   5B: Requesting Mobile Money Payout (MTN MoMo)...");
    const momoResult = await requestAffiliateWithdrawal(rootAgent.id, {
      amount: 10.0,
      payoutMethod: "MOMO",
      network: "MTN",
      momoNumber: "0507904981",
      accountName: "Felix Dzrah",
    });

    assert.strictEqual(momoResult.status, "PENDING");
    assert.strictEqual(momoResult.payoutMethod, "MOMO");
    assert.strictEqual(momoResult.momoNumber, "0507904981");

    const postMomoRoot = await prisma.user.findUnique({ where: { id: rootAgent.id } });
    assert.strictEqual(postMomoRoot?.affiliateBalance, 5.0, "Affiliate balance must decrease to 5.00 while held in escrow");

    // Test 5C: Admin Approves MoMo Withdrawal
    console.log("   5C: Admin Approves MoMo Payout...");
    const approvedWd = await approveAffiliateWithdrawal(momoResult.id, "superadmin@bdport.com");
    assert.strictEqual(approvedWd.status, "APPROVED");
    console.log("   ✓ MoMo payout approved by admin");

    // Test 5D: Admin Rejects MoMo Withdrawal with Automated Balance Refund
    console.log("   5D: Testing MoMo rejection and automated refund to affiliate wallet...");
    // Request another 5 GHS MoMo withdrawal
    const momoResult2 = await requestAffiliateWithdrawal(rootAgent.id, {
      amount: 5.0,
      payoutMethod: "MOMO",
      network: "TELECEL",
      momoNumber: "0201112233",
      accountName: "Felix Telecel",
    });

    const preRejectRoot = await prisma.user.findUnique({ where: { id: rootAgent.id } });
    assert.strictEqual(preRejectRoot?.affiliateBalance, 0.0);

    // Admin rejects with reason
    const rejectedWd = await rejectAffiliateWithdrawal(momoResult2.id, "Invalid momo number provided", "superadmin@bdport.com");
    assert.strictEqual(rejectedWd.status, "REJECTED");
    assert.strictEqual(rejectedWd.adminNote, "Invalid momo number provided");

    const postRejectRoot = await prisma.user.findUnique({ where: { id: rootAgent.id } });
    assert.strictEqual(postRejectRoot?.affiliateBalance, 5.0, "Rejected amount must be fully refunded back to affiliate balance");
    console.log("   ✓ Rejection test passed: GHS 5.00 immediately refunded back to affiliate wallet\n");

    // -------------------------------------------------------------------------
    // Step 6: Test Overview API Aggregates
    // -------------------------------------------------------------------------
    console.log("Step 6: Verifying Agent Affiliate Overview & Pricing Aggregates...");
    const rootOverview = await getAgentAffiliateOverview(rootAgent.id);
    assert.strictEqual(rootOverview.directSubAgentsCount, 1, "Root has 1 direct sub-agent (Sub-Agent A)");
    assert.strictEqual(rootOverview.affiliateBalance, 5.0, "Current affiliate balance must be 5.00");
    assert.strictEqual(rootOverview.mainBalance, 110.0, "Main balance must be 110.00");
    assert.strictEqual(rootOverview.withdrawals.length, 3, "Root must have 3 withdrawal records");

    const agentAOverview = await getAgentAffiliateOverview(subAgentA.id);
    assert.strictEqual(agentAOverview.directSubAgentsCount, 1, "Agent A has 1 direct sub-agent (Sub-Agent B)");

    const pricingSheet = await getAgentAffiliatePricingSheet(rootAgent.id);
    const configuredItem = pricingSheet.find((p) => p.packageId === testPkg.id);
    assert.strictEqual(configuredItem?.subAgentWholesalePrice, 12.0);
    assert.strictEqual(configuredItem?.profitMargin, 2.0);

    console.log("   ✓ Overview data, downline count, and pricing sheet verified\n");

    console.log("==================================================================");
    console.log("🎉 ALL E2E AFFILIATE & WALLET TESTS PASSED WITH 100% SUCCESS!");
    console.log("==================================================================");
  } finally {
    // Cleanup test data to keep database completely clean
    console.log("\nCleaning up test records from database...");
    if (testOrders.length > 0) {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: testOrders } } });
      await prisma.affiliateCommission.deleteMany({ where: { originOrderId: { in: testOrders } } });
      await prisma.order.deleteMany({ where: { id: { in: testOrders } } });
    }
    if (testUsers.length > 0) {
      await prisma.affiliateWithdrawal.deleteMany({ where: { userId: { in: testUsers } } });
      await prisma.affiliatePackagePrice.deleteMany({ where: { agentId: { in: testUsers } } });
      await prisma.walletTransaction.deleteMany({ where: { userId: { in: testUsers } } });
      await prisma.user.deleteMany({ where: { id: { in: testUsers } } });
    }
    if (testPackages.length > 0) {
      await prisma.priceTier.deleteMany({ where: { gbAmount: { in: [99.0] } } });
      await prisma.dataPackage.deleteMany({ where: { id: { in: testPackages } } });
    }
    console.log("✓ Cleanup finished cleanly.\n");
  }
}

runE2ETests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ E2E TEST FAILED:", err);
    process.exit(1);
  });
