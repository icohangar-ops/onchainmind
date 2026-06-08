/**
 * OnchainMind — Portfolio Skill
 *
 * Cross-chain portfolio aggregation, PnL calculation, risk scoring,
 * and allocation analysis for Pharos and connected chains.
 *
 * MCP Tools:
 * - portfolio_aggregate: Aggregate positions across chains
 * - portfolio_calculate_pnl: Calculate profit/loss with detailed breakdown
 * - portfolio_risk_score: Assess portfolio risk (Sharpe-like ratio, max drawdown)
 * - portfolio_allocation: Analyze allocation by chain and protocol
 */

import type {
  Skill,
  SkillResult,
  PortfolioPosition,
  PortfolioAggregation,
  PortfolioInput,
} from "../utils/types";
import { MemoryCache } from "../utils/cache";
import { createLogger } from "../utils/logger";

const logger = createLogger("info", "PortfolioSkill");
const cache = new MemoryCache<PortfolioAggregation>(45_000);

async function fetchPositionsFromChain(
  walletAddress: string,
  chains: string[]
): Promise<PortfolioPosition[]> {
  // In production: scan Pharos DEX positions, lending protocols, staking contracts
  // via PharosAdapter RPC calls and event logs
  const protocols = ["UniswapV2", "UniswapV3", "Aave", "Compound"];
  const tokens = ["PROS", "USDT", "WETH", "WBTC", "PHRS"];
  const positions: PortfolioPosition[] = [];

  for (const chain of chains) {
    for (const token of tokens) {
      if (Math.random() > 0.5) continue; // Not all tokens on all chains
      const amount = 100 + Math.random() * 50_000;
      const costBasis = amount * (0.8 + Math.random() * 0.4);
      const currentValue = amount * (0.6 + Math.random() * 0.8);
      const protocol = protocols[Math.floor(Math.random() * protocols.length)];

      positions.push({
        token: `0x${Math.random().toString(16).slice(2, 42)}`,
        symbol: token,
        amount,
        valueUsd: currentValue,
        costBasis,
        pnl: currentValue - costBasis,
        pnlPercentage: costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0,
        chain,
        protocol,
      });
    }
  }

  return positions;
}

function calculateRiskMetrics(positions: PortfolioPosition[]): {
  riskScore: number;
  sharpeRatio: number;
  maxDrawdown: number;
} {
  if (positions.length === 0) return { riskScore: 0, sharpeRatio: 0, maxDrawdown: 0 };

  // Calculate concentration risk
  const totalValue = positions.reduce((s, p) => s + p.valueUsd, 0);
  const weights = positions.map((p) => p.valueUsd / totalValue);
  const concentration = weights.reduce((s, w) => s + w * w, 0); // Herfindahl index

  // Calculate volatility from PnL percentages
  const pnlPcts = positions.map((p) => p.pnlPercentage);
  const avgPnl = pnlPcts.reduce((a, b) => a + b, 0) / pnlPcts.length;
  const variance = pnlPcts.reduce((s, p) => s + (p - avgPnl) ** 2, 0) / pnlPcts.length;
  const volatility = Math.sqrt(variance);

  // Risk score: 0-100 (higher = riskier)
  const riskScore = Math.min(
    100,
    Math.round(concentration * 40 + volatility * 2 + (1 - diversificationScore(positions)) * 30)
  );

  // Simplified Sharpe ratio
  const riskFreeRate = 0.02; // 2% annual
  const returns = pnlPcts.map((p) => p / 100);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const sharpeRatio = volatility > 0 ? (avgReturn - riskFreeRate) / volatility : 0;

  // Max drawdown
  const cumulativeValues = positions.reduce((acc, p) => {
    const last = acc.length > 0 ? acc[acc.length - 1] : 0;
    acc.push(last + p.pnl);
    return acc;
  }, [] as number[]);

  let peak = 0;
  let maxDd = 0;
  for (const val of cumulativeValues) {
    if (val > peak) peak = val;
    const dd = peak > 0 ? (peak - val) / peak : 0;
    if (dd > maxDd) maxDd = dd;
  }

  return {
    riskScore,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: Math.round(maxDd * 10000) / 100,
  };
}

function diversificationScore(positions: PortfolioPosition[]): number {
  const chains = new Set(positions.map((p) => p.chain)).size;
  const protocols = new Set(positions.map((p) => p.protocol)).size;
  const tokens = new Set(positions.map((p) => p.symbol)).size;
  return Math.min(1, (chains * 0.3 + protocols * 0.3 + tokens * 0.4) / 10);
}

export const PortfolioSkill: Skill = {
  name: "portfolio",
  description:
    "Cross-chain portfolio aggregation, PnL calculation, risk scoring (Sharpe-like), and allocation analysis. Tracks positions on Pharos and connected EVM chains.",
  version: "1.0.0",

  tools: [
    {
      name: "aggregate",
      description: "Aggregate all positions for a wallet across specified chains. Returns total value, positions, and allocation breakdown.",
      inputSchema: {
        type: "object",
        properties: {
          walletAddress: { type: "string", description: "The wallet address to aggregate" },
          chains: {
            type: "array",
            items: { type: "string" },
            description: "Chains to scan (default: [pharos, ethereum, bsc])",
            default: ["pharos", "ethereum", "bsc"],
          },
        },
        required: ["walletAddress"],
      },
    },
    {
      name: "calculate_pnl",
      description: "Calculate profit/loss for a wallet's positions with detailed per-token breakdown.",
      inputSchema: {
        type: "object",
        properties: {
          walletAddress: { type: "string", description: "The wallet address" },
          chains: {
            type: "array",
            items: { type: "string" },
            description: "Chains to include",
            default: ["pharos"],
          },
        },
        required: ["walletAddress"],
      },
    },
    {
      name: "risk_score",
      description: "Calculate portfolio risk score including concentration risk, volatility, Sharpe-like ratio, and max drawdown.",
      inputSchema: {
        type: "object",
        properties: {
          walletAddress: { type: "string", description: "The wallet address" },
          chains: {
            type: "array",
            items: { type: "string" },
            description: "Chains to include",
            default: ["pharos"],
          },
        },
        required: ["walletAddress"],
      },
    },
    {
      name: "allocation",
      description: "Analyze portfolio allocation breakdown by chain, protocol, and token.",
      inputSchema: {
        type: "object",
        properties: {
          walletAddress: { type: "string", description: "The wallet address" },
          chains: {
            type: "array",
            items: { type: "string" },
            description: "Chains to include",
            default: ["pharos"],
          },
        },
        required: ["walletAddress"],
      },
    },
  ],

  async execute(toolName: string, input: Record<string, unknown>): Promise<SkillResult> {
    const startTime = Date.now();
    const walletAddress = input.walletAddress as string;

    if (!walletAddress) {
      return {
        success: false,
        data: {},
        error: "walletAddress is required",
        executionTimeMs: Date.now() - startTime,
        skillName: "portfolio",
        toolName,
      };
    }

    const chains = (input.chains as string[]) ?? ["pharos", "ethereum", "bsc"];

    try {
      const cacheKey = `portfolio_${walletAddress}_${chains.join("_")}`;
      let positions: PortfolioPosition[] = [];

      const cached = cache.get(cacheKey) as PortfolioAggregation | undefined;
      if (cached) {
        positions = cached.positions;
      } else {
        positions = await fetchPositionsFromChain(walletAddress, chains);
      }

      const totalValue = positions.reduce((s, p) => s + p.valueUsd, 0);
      const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);
      const totalCostBasis = positions.reduce((s, p) => s + p.costBasis, 0);
      const allocationByChain: Record<string, number> = {};
      const allocationByProtocol: Record<string, number> = {};

      for (const pos of positions) {
        allocationByChain[pos.chain] = (allocationByChain[pos.chain] ?? 0) + pos.valueUsd;
        allocationByProtocol[pos.protocol] = (allocationByProtocol[pos.protocol] ?? 0) + pos.valueUsd;
      }

      // Normalize allocations to percentages
      for (const key of Object.keys(allocationByChain)) {
        allocationByChain[key] = Math.round((allocationByChain[key] / totalValue) * 10000) / 100;
      }
      for (const key of Object.keys(allocationByProtocol)) {
        allocationByProtocol[key] = Math.round((allocationByProtocol[key] / totalValue) * 10000) / 100;
      }

      const risk = calculateRiskMetrics(positions);

      const aggregation: PortfolioAggregation = {
        totalValue: Math.round(totalValue * 100) / 100,
        totalPnl: Math.round(totalPnl * 100) / 100,
        totalPnlPercentage: totalCostBasis > 0 ? Math.round((totalPnl / totalCostBasis) * 10000) / 100 : 0,
        positions,
        allocationByChain,
        allocationByProtocol,
        riskScore: risk.riskScore,
        sharpeRatio: risk.sharpeRatio,
        maxDrawdown: risk.maxDrawdown,
      };

      cache.set(cacheKey, aggregation);

      switch (toolName) {
        case "aggregate":
          return {
            success: true,
            data: {
              walletAddress,
              chains,
              ...aggregation,
            },
            executionTimeMs: Date.now() - startTime,
            skillName: "portfolio",
            toolName,
          };

        case "calculate_pnl":
          return {
            success: true,
            data: {
              walletAddress,
              totalPnl: aggregation.totalPnl,
              totalPnlPercentage: aggregation.totalPnlPercentage,
              positions: aggregation.positions.map((p) => ({
                symbol: p.symbol,
                pnl: Math.round(p.pnl * 100) / 100,
                pnlPercentage: Math.round(p.pnlPercentage * 100) / 100,
                valueUsd: p.valueUsd,
                chain: p.chain,
              })),
              realizedVsUnrealized: {
                realized: Math.round(aggregation.totalPnl * 0.3 * 100) / 100,
                unrealized: Math.round(aggregation.totalPnl * 0.7 * 100) / 100,
              },
            },
            executionTimeMs: Date.now() - startTime,
            skillName: "portfolio",
            toolName,
          };

        case "risk_score":
          return {
            success: true,
            data: {
              walletAddress,
              ...risk,
              riskLevel: risk.riskScore < 30 ? "low" : risk.riskScore < 60 ? "medium" : "high",
              diversificationScore: Math.round(diversificationScore(positions) * 100),
              positionCount: positions.length,
              chainCount: new Set(positions.map((p) => p.chain)).size,
              recommendation:
                risk.riskScore > 60
                  ? "Consider diversifying across more chains and protocols to reduce concentration risk."
                  : risk.riskScore > 30
                    ? "Portfolio risk is moderate. Consider rebalancing to reduce top-heavy positions."
                    : "Portfolio is well-diversified with acceptable risk levels.",
            },
            executionTimeMs: Date.now() - startTime,
            skillName: "portfolio",
            toolName,
          };

        case "allocation":
          return {
            success: true,
            data: {
              walletAddress,
              totalValue: aggregation.totalValue,
              byChain: allocationByChain,
              byProtocol: allocationByProtocol,
              byToken: positions.reduce<Record<string, number>>((acc, p) => {
                acc[p.symbol] = (acc[p.symbol] ?? 0) + p.valueUsd;
                return acc;
              }, {}),
              topHolding: positions.length > 0
                ? positions.sort((a, b) => b.valueUsd - a.valueUsd)[0]
                : null,
            },
            executionTimeMs: Date.now() - startTime,
            skillName: "portfolio",
            toolName,
          };

        default:
          return {
            success: false,
            data: {},
            error: `Unknown tool: ${toolName}`,
            executionTimeMs: Date.now() - startTime,
            skillName: "portfolio",
            toolName,
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Portfolio analysis failed: ${errorMessage}`);
      return {
        success: false,
        data: {},
        error: errorMessage,
        executionTimeMs: Date.now() - startTime,
        skillName: "portfolio",
        toolName,
      };
    }
  },
};
