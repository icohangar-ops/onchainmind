/**
 * Example: Using TokenAnalysisSkill Standalone
 *
 * Demonstrates how to use a single OnchainMind skill without the full
 * MCP server. Useful for integration testing, scripting, or embedding
 * OnchainMind skills into custom applications.
 */

import { TokenAnalysisSkill } from "../src/skills/TokenAnalysisSkill";

async function main(): Promise<void> {
  console.log("=== Single Skill Usage Example ===\n");

  // ─── 1. Explore the skill's metadata ───────────────────────────────────
  console.log("Skill Name:", TokenAnalysisSkill.name);
  console.log("Description:", TokenAnalysisSkill.description);
  console.log("Version:", TokenAnalysisSkill.version);
  console.log("Available Tools:", TokenAnalysisSkill.tools.map((t) => t.name).join(", "));
  console.log();

  // ─── 2. Execute: Get Token Metrics ──────────────────────────────────────
  console.log("--- Executing get_metrics ---");
  const tokenAddress = "0x1234567890abcdef1234567890abcdef12345678";

  const metricsResult = await TokenAnalysisSkill.execute("get_metrics", {
    tokenAddress,
    chain: "pharos",
  });

  if (metricsResult.success) {
    console.log(`✓ Metrics fetched in ${metricsResult.executionTimeMs}ms`);
    console.log(`  Price: ${(metricsResult.data as { metrics: { price: number } }).metrics.price}`);
    console.log(`  Volume 24h: ${(metricsResult.data as { metrics: { volume24h: number } }).metrics.volume24h}`);
    console.log(`  Holders: ${(metricsResult.data as { metrics: { holders: number } }).metrics.holders}`);
    console.log(`  Liquidity: ${(metricsResult.data as { metrics: { liquidity: number } }).metrics.liquidity}`);
  } else {
    console.error(`✗ Error: ${metricsResult.error}`);
  }

  console.log();

  // ─── 3. Execute: Track Whales ──────────────────────────────────────────
  console.log("--- Executing track_whales ---");
  const whaleResult = await TokenAnalysisSkill.execute("track_whales", {
    tokenAddress,
    thresholdUsd: 100_000,
  });

  if (whaleResult.success) {
    const data = whaleResult.data as { summary: { totalAlerts: number; netFlow: number } };
    console.log(`✓ Whale tracking completed in ${whaleResult.executionTimeMs}ms`);
    console.log(`  Total Alerts: ${data.summary.totalAlerts}`);
    console.log(`  Net Flow: $${data.summary.netFlow.toFixed(2)}`);
  }

  console.log();

  // ─── 4. Execute: Analyze Liquidity ───────────────────────────────────────
  console.log("--- Executing analyze_liquidity ---");
  const liquidityResult = await TokenAnalysisSkill.execute("analyze_liquidity", {
    tokenAddress,
  });

  if (liquidityResult.success) {
    console.log(`✓ Liquidity analysis completed in ${liquidityResult.executionTimeMs}ms`);
    console.log(`  Slippage Warning: ${(liquidityResult.data as { slippageWarning: string }).slippageWarning}`);
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
