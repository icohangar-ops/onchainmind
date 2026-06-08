/**
 * Example: Custom Workflow with Conditional Branching
 *
 * Demonstrates a more sophisticated workflow pattern where the execution
 * path branches based on intermediate results. This is a pattern that
 * Pharos AI agents would use for intelligent decision-making.
 *
 * Workflow: Token Discovery → Risk Gate → [Safe Path | Unsafe Path]
 *
 * 1. Fetch token metrics
 * 2. Run risk scan
 * 3. If SAFE:
 *    a. Check sentiment
 *    b. Find yield opportunities
 * 4. If DANGEROUS:
 *    a. Log warning
 *    b. Suggest alternatives
 *
 * This pattern can be used with the SkillComposer's condition feature
 * or implemented manually as shown here for maximum flexibility.
 */

import { TokenAnalysisSkill } from "../src/skills/TokenAnalysisSkill";
import { RiskGuardSkill } from "../src/skills/RiskGuardSkill";
import { SentimentSkill } from "../src/skills/SentimentSkill";
import { DefiStrategySkill } from "../src/skills/DefiStrategySkill";
import { PortfolioSkill } from "../src/skills/PortfolioSkill";

// ─── Decision helpers ────────────────────────────────────────────────────

interface WorkflowContext {
  tokenAddress: string;
  riskLevel?: string;
  riskScore?: number;
  sentimentScore?: number;
  sentimentLabel?: string;
  recommendedAction?: string;
  yieldOpportunities?: unknown;
  portfolioImpact?: unknown;
}

async function evaluateToken(tokenAddress: string): Promise<WorkflowContext> {
  const ctx: WorkflowContext = { tokenAddress };
  const logs: string[] = [];

  // ─── Gate 1: Quick Honeypot Check ──────────────────────────────────────
  logs.push("🔍 Quick honeypot check...");
  const honeypotResult = await RiskGuardSkill.execute("check_honeypot", { contractAddress: tokenAddress });

  if (!honeypotResult.success) {
    ctx.recommendedAction = "SKIP: Unable to verify contract safety";
    return ctx;
  }

  const honeypot = honeypotResult.data as { isHoneypot: boolean; sellTax: number };

  if (honeypot.isHoneypot) {
    logs.push("🚨 HONEYPOT DETECTED — aborting workflow");
    ctx.riskLevel = "HONEYPOT";
    ctx.riskScore = 100;
    ctx.recommendedAction = "AVOID: This token is a honeypot. Do not interact.";
    console.log(logs.join("\n"));
    return ctx;
  }

  if (honeypot.sellTax > 10) {
    logs.push(`⚠️ High sell tax (${honeypot.sellTax}%) — will flag as caution`);
  }

  // ─── Gate 2: Full Risk Scan ─────────────────────────────────────────────
  logs.push("🛡️ Running full risk scan...");
  const riskResult = await RiskGuardSkill.execute("scan_contract", { contractAddress: tokenAddress });

  if (!riskResult.success) {
    ctx.recommendedAction = "SKIP: Risk scan failed";
    return ctx;
  }

  const risk = riskResult.data as { overallRisk: string; riskScore: number };
  ctx.riskLevel = risk.overallRisk;
  ctx.riskScore = risk.riskScore;
  logs.push(`  Risk: ${risk.overallRisk} (score: ${risk.riskScore}/100)`);

  // ─── Branch: DANGEROUS path ─────────────────────────────────────────────
  if (risk.overallRisk === "dangerous") {
    logs.push("🔴 DANGEROUS — taking unsafe path");
    ctx.recommendedAction = "AVOID: Multiple safety checks failed. High rug pull probability.";
    console.log(logs.join("\n"));
    return ctx;
  }

  // ─── Branch: CAUTION path ──────────────────────────────────────────────
  if (risk.overallRisk === "caution") {
    logs.push("🟡 CAUTION — limited exploration path");
    ctx.recommendedAction = "CAUTION: Token has some risk indicators. Only small positions recommended.";

    // Still check sentiment for informational purposes
    const sentimentResult = await SentimentSkill.execute("analyze_sentiment", { tokenAddress });
    if (sentimentResult.success) {
      const sentiment = sentimentResult.data as { overall: number; label: string };
      ctx.sentimentScore = sentiment.overall;
      ctx.sentimentLabel = sentiment.label;
      logs.push(`  Sentiment: ${sentiment.overall}/100 (${sentiment.label})`);
    }

    console.log(logs.join("\n"));
    return ctx;
  }

  // ─── Branch: SAFE path ─────────────────────────────────────────────────
  logs.push("🟢 SAFE — taking full analysis path");

  // Get token metrics
  const metricsResult = await TokenAnalysisSkill.execute("get_metrics", { tokenAddress, chain: "pharos" });
  if (metricsResult.success) {
    const metrics = metricsResult.data as { metrics: { price: number; volume24h: number; holders: number } };
    logs.push(`  Price: $${metrics.metrics.price.toFixed(6)}`);
    logs.push(`  Holders: ${metrics.metrics.holders.toLocaleString()}`);
  }

  // Analyze sentiment
  const sentimentResult = await SentimentSkill.execute("analyze_sentiment", { tokenAddress });
  if (sentimentResult.success) {
    const sentiment = sentimentResult.data as { overall: number; label: string; trending: boolean };
    ctx.sentimentScore = sentiment.overall;
    ctx.sentimentLabel = sentiment.label;
    logs.push(`  Sentiment: ${sentiment.overall}/100 (${sentiment.label})${sentiment.trending ? " 📈 TRENDING" : ""}`);
  }

  // Scan for yields
  const yieldResult = await DefiStrategySkill.execute("scan_yields", {
    minTvl: 50_000,
    maxRisk: "low",
  });
  if (yieldResult.success) {
    ctx.yieldOpportunities = yieldResult.data;
    const yields = yieldResult.data as { filteredPools: number };
    logs.push(`  Yield Opportunities: ${yields.filteredPools} pools found`);
  }

  // Simulate portfolio impact
  const portfolioResult = await PortfolioSkill.execute("aggregate", {
    walletAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
    chains: ["pharos"],
  });
  if (portfolioResult.success) {
    ctx.portfolioImpact = portfolioResult.data;
  }

  ctx.recommendedAction = "PROCEED: Token passes all safety checks. Consider position sizing based on sentiment.";
  console.log(logs.join("\n"));
  return ctx;
}

async function main(): Promise<void> {
  console.log("=== Custom Workflow with Conditional Branching ===\n");

  // Test with multiple tokens to demonstrate branching
  const testTokens = [
    { address: "0xaaa111111111111111111111111111111111111", label: "Safe Token" },
    { address: "0xbbb222222222222222222222222222222222222", label: "Risky Token" },
    { address: "0xccc333333333333333333333333333333333333", label: "Honeypot Token" },
  ];

  for (const token of testTokens) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`Evaluating: ${token.label} (${token.address.slice(0, 10)}...)`);
    console.log(`${"═".repeat(60)}\n`);

    const ctx = await evaluateToken(token.address);

    console.log(`\n┌─ Result ─────────────────────────────────`);
    console.log(`│ Token:      ${ctx.tokenAddress.slice(0, 10)}...`);
    console.log(`│ Risk Level: ${ctx.riskLevel ?? "unknown"}`);
    console.log(`│ Risk Score: ${ctx.riskScore ?? "N/A"}/100`);
    console.log(`│ Sentiment:  ${ctx.sentimentScore ?? "N/A"}/100 (${ctx.sentimentLabel ?? "unknown"})`);
    console.log(`│ Action:     ${ctx.recommendedAction ?? "unknown"}`);
    console.log(`└──────────────────────────────────────────`);
  }

  console.log("\n=== Workflow Complete ===");
}

main().catch(console.error);
