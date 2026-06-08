/**
 * Example: Skill Chaining — Sentiment-Aware Yield Hunting
 *
 * Demonstrates how to chain multiple OnchainMind skills together
 * to create a powerful workflow:
 *
 *   SentimentSkill.analyze_sentiment
 *     → TokenAnalysisSkill.get_metrics
 *       → DefiStrategySkill.scan_yields
 *
 * This creates a "sentiment-aware yield hunting" pipeline that:
 * 1. First checks if a token has positive social sentiment
 * 2. Then fetches its on-chain metrics to validate quality
 * 3. Finally scans for DeFi yield opportunities involving the token
 *
 * Skills can also be chained using the SkillComposer's `chain()` method
 * for automatic input/output mapping.
 */

import { SentimentSkill } from "../src/skills/SentimentSkill";
import { TokenAnalysisSkill } from "../src/skills/TokenAnalysisSkill";
import { DefiStrategySkill } from "../src/skills/DefiStrategySkill";

async function main(): Promise<void> {
  console.log("=== Skill Chaining Example ===");
  console.log("Workflow: Sentiment → Token Analysis → Yield Hunting\n");

  const tokenAddress = "0x1234567890abcdef1234567890abcdef12345678";

  // ─── Step 1: Analyze Sentiment ──────────────────────────────────────────
  console.log("[Step 1/3] Analyzing token sentiment...");
  const sentimentResult = await SentimentSkill.execute("analyze_sentiment", {
    tokenAddress,
    timeframe: "24h",
  });

  if (!sentimentResult.success) {
    console.error(`✗ Sentiment analysis failed: ${sentimentResult.error}`);
    return;
  }

  const sentiment = sentimentResult.data as {
    overall: number;
    label: string;
    trending: boolean;
    mentionCount: number;
  };

  console.log(`  Sentiment Score: ${sentiment.overall}/100 (${sentiment.label})`);
  console.log(`  Trending: ${sentiment.trending}`);
  console.log(`  Mentions: ${sentiment.mentionCount}`);

  // Conditional: Only proceed if sentiment is positive enough
  if (sentiment.overall < 40) {
    console.log("\n⚠ Sentiment too low. Skipping yield hunting for this token.");
    return;
  }

  console.log("  ✓ Sentiment is positive enough to proceed.\n");

  // ─── Step 2: Get Token Metrics ──────────────────────────────────────────
  console.log("[Step 2/3] Fetching on-chain token metrics...");
  const metricsResult = await TokenAnalysisSkill.execute("get_metrics", {
    tokenAddress,
    chain: "pharos",
  });

  if (!metricsResult.success) {
    console.error(`✗ Token analysis failed: ${metricsResult.error}`);
    return;
  }

  const metrics = metricsResult.data as {
    metrics: {
      price: number;
      volume24h: number;
      liquidity: number;
      holders: number;
    };
  };

  console.log(`  Price: $${metrics.metrics.price.toFixed(6)}`);
  console.log(`  Volume 24h: $${(metrics.metrics.volume24h / 1_000_000).toFixed(2)}M`);
  console.log(`  Liquidity: $${(metrics.metrics.liquidity / 1_000_000).toFixed(2)}M`);
  console.log(`  Holders: ${metrics.metrics.holders.toLocaleString()}`);

  // Conditional: Skip if liquidity is too low
  if (metrics.metrics.liquidity < 100_000) {
    console.log("\n⚠ Liquidity too low for safe yield hunting. Skipping.");
    return;
  }

  console.log("  ✓ Token has sufficient liquidity.\n");

  // ─── Step 3: Scan for Yield Opportunities ───────────────────────────────
  console.log("[Step 3/3] Scanning DeFi yield opportunities...");
  const yieldResult = await DefiStrategySkill.execute("scan_yields", {
    minTvl: 50_000,
    maxRisk: "medium",
  });

  if (!yieldResult.success) {
    console.error(`✗ Yield scan failed: ${yieldResult.error}`);
    return;
  }

  const yields = yieldResult.data as {
    topPicks: Array<{ pair: string; protocol: string; apy: number; tvl: number; riskLevel: string }>;
    filteredPools: number;
  };

  console.log(`  Found ${yields.filteredPools} eligible pools`);
  console.log("  Top Picks:");
  for (const pick of yields.topPicks.slice(0, 3)) {
    console.log(`    ${pick.pair} on ${pick.protocol}: ${pick.apy}% APY (TVL: $${(pick.tvl / 1_000_000).toFixed(2)}M, Risk: ${pick.riskLevel})`);
  }

  // ─── Summary ────────────────────────────────────────────────────────────
  console.log("\n=== Pipeline Complete ===");
  console.log(`Total time: ${sentimentResult.executionTimeMs + metricsResult.executionTimeMs + yieldResult.executionTimeMs}ms`);
  console.log("Result: Sentiment-validated token with yield opportunities identified.");
}

main().catch(console.error);
