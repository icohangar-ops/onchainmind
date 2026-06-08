// OnchainMind — MCP Server Entry Point
// Registers all composable AI Skills for Pharos AI Agent ecosystem

import { startStdioServer, startSSEServer } from "./core/MCPServer";
import { skillRegistry } from "./core/SkillRegistry";
import { skillComposer } from "./core/SkillComposer";
import { TokenAnalysisSkill } from "./skills/TokenAnalysisSkill";
import { PortfolioSkill } from "./skills/PortfolioSkill";
import { DefiStrategySkill } from "./skills/DefiStrategySkill";
import { SentimentSkill } from "./skills/SentimentSkill";
import { RiskGuardSkill } from "./skills/RiskGuardSkill";
import { loadConfig, initLogger } from "./utils/config";
import type { OnchainMindConfig } from "./utils/types";

let isShuttingDown = false;

async function main(): Promise<void> {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ███╗   ██╗███████╗██╗  ██╗██╗   ██╗                      ║
║   ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║                      ║
║   ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║                      ║
║   ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║                      ║
║   ██║ ╚████║███████╗██╔╝ ╚██╗╚██████╔╝                     ║
║   ╚═╝  ╚═══╝╚══════╝╚═╝   ╚═╝ ╚═════╝                       ║
║                                                              ║
║   Composable MCP Skills for Pharos AI Agents                 ║
║   Pharos Phase 1 Skill Hackathon                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // ─── 1. Load Configuration ─────────────────────────────────────────────
  const config: OnchainMindConfig = loadConfig();
  initLogger(config.logLevel);

  // ─── 2. Register All Skills ─────────────────────────────────────────────
  console.log("[OnchainMind] Registering skills...");

  skillRegistry.register(TokenAnalysisSkill);
  skillRegistry.register(PortfolioSkill);
  skillRegistry.register(DefiStrategySkill);
  skillRegistry.register(SentimentSkill);
  skillRegistry.register(RiskGuardSkill);

  const stats = skillRegistry.getStats();
  console.log(`[OnchainMind] Registered ${stats.skillCount} skills with ${stats.toolCount} tools`);

  // Log registered skills
  for (const summary of skillRegistry.getSummary()) {
    console.log(`  ✓ ${summary.name} (v${summary.version}) — ${summary.toolNames.join(", ")}`);
  }

  // ─── 3. Register Pre-Built Workflows ─────────────────────────────────────
  console.log("[OnchainMind] Registering pre-built workflows...");

  // Workflow: Sentiment-Aware Yield Hunting
  const sentimentYieldHunt = skillComposer.chain([
    { skillName: "sentiment", toolName: "analyze_sentiment" },
    { skillName: "token_analysis", toolName: "get_metrics" },
    { skillName: "defi_strategy", toolName: "scan_yields" },
  ]);
  skillComposer.registerWorkflow(sentimentYieldHunt);

  // Workflow: Safe Token Discovery
  const safeDiscovery = skillComposer.chain([
    { skillName: "token_analysis", toolName: "get_metrics" },
    { skillName: "risk_guard", toolName: "scan_contract" },
    { skillName: "sentiment", toolName: "analyze_sentiment" },
  ]);
  skillComposer.registerWorkflow(safeDiscovery);

  // Workflow: Portfolio Risk Assessment
  const portfolioRisk = skillComposer.chain([
    { skillName: "portfolio", toolName: "aggregate" },
    { skillName: "portfolio", toolName: "risk_score" },
    { skillName: "defi_strategy", toolName: "scan_yields" },
  ]);
  skillComposer.registerWorkflow(portfolioRisk);

  console.log(`[OnchainMind] Registered ${skillComposer.listWorkflowNames().length} workflows`);
  for (const name of skillComposer.listWorkflowNames()) {
    console.log(`  → ${name}`);
  }

  // ─── 4. Setup Graceful Shutdown ─────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      console.warn(`[OnchainMind] Already shutting down, ignoring ${signal}`);
      return;
    }
    isShuttingDown = true;
    console.log(`\n[OnchainMind] Received ${signal}. Shutting down gracefully...`);

    // Allow a brief moment for in-flight requests
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log("[OnchainMind] Goodbye!");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Handle uncaught errors gracefully
  process.on("uncaughtException", (error) => {
    console.error(`[OnchainMind] Uncaught exception: ${error instanceof Error ? error.message : String(error)}`);
    shutdown("UNCAUGHT_EXCEPTION");
  });

  process.on("unhandledRejection", (reason) => {
    console.error(`[OnchainMind] Unhandled rejection: ${String(reason)}`);
    shutdown("UNHANDLED_REJECTION");
  });

  // ─── 5. Start MCP Server ────────────────────────────────────────────────
  console.log(`\n[OnchainMind] Starting MCP server (transport: ${config.mcpTransport})...`);

  try {
    if (config.mcpTransport === "sse") {
      await startSSEServer(config);
      console.log(`[OnchainMind] MCP Server running on SSE (port ${config.ssePort})`);
    } else {
      await startStdioServer(config);
      console.log("[OnchainMind] MCP Server running on stdio transport");
      console.log("[OnchainMind] Ready to accept MCP client connections");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[OnchainMind] Failed to start MCP server: ${message}`);
    process.exit(1);
  }
}

main();
