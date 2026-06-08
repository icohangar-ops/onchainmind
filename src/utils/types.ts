/**
 * OnchainMind — Core TypeScript Types
 *
 * All shared type definitions used across skills, core infrastructure,
 * and MCP tool schemas. Strict types only — no `any`.
 */

// ─── Skill Interface ─────────────────────────────────────────────────────────

/** Metadata describing a single MCP tool within a skill */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

/** Result of a skill execution */
export interface SkillResult<T = Record<string, unknown>> {
  readonly success: boolean;
  readonly data: T;
  readonly error?: string;
  readonly executionTimeMs: number;
  readonly skillName: string;
  readonly toolName: string;
}

/** The core Skill interface — every OnchainMind skill must implement this */
export interface Skill {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly tools: ToolDefinition[];

  /** Execute a specific tool within this skill */
  execute(toolName: string, input: Record<string, unknown>): Promise<SkillResult>;
}

// ─── Token Analysis Types ──────────────────────────────────────────────────

export interface TokenMetrics {
  readonly address: string;
  readonly symbol: string;
  readonly name: string;
  readonly price: number;
  readonly priceChange24h: number;
  readonly volume24h: number;
  readonly marketCap: number;
  readonly liquidity: number;
  readonly liquidityDepth: LiquidityDepth;
  readonly holders: number;
  readonly transactions24h: number;
}

export interface LiquidityDepth {
  readonly depthAt0_1Percent: number;
  readonly depthAt0_5Percent: number;
  readonly depthAt1Percent: number;
  readonly depthAt5Percent: number;
}

export interface PricePoint {
  readonly timestamp: number;
  readonly price: number;
  readonly volume: number;
}

export interface WhaleAlert {
  readonly address: string;
  readonly token: string;
  readonly amount: number;
  readonly valueUsd: number;
  readonly type: "buy" | "sell" | "transfer";
  readonly timestamp: number;
  readonly chain: string;
}

export interface TokenAnalysisInput {
  readonly tokenAddress: string;
  readonly chain?: string;
  readonly includeWhaleAlerts?: boolean;
  readonly timeframe?: "1h" | "24h" | "7d" | "30d";
}

// ─── Portfolio Types ────────────────────────────────────────────────────────

export interface PortfolioPosition {
  readonly token: string;
  readonly symbol: string;
  readonly amount: number;
  readonly valueUsd: number;
  readonly costBasis: number;
  readonly pnl: number;
  readonly pnlPercentage: number;
  readonly chain: string;
  readonly protocol: string;
}

export interface PortfolioAggregation {
  readonly totalValue: number;
  readonly totalPnl: number;
  readonly totalPnlPercentage: number;
  readonly positions: PortfolioPosition[];
  readonly allocationByChain: Record<string, number>;
  readonly allocationByProtocol: Record<string, number>;
  readonly riskScore: number;
  readonly sharpeRatio: number;
  readonly maxDrawdown: number;
}

export interface PortfolioInput {
  readonly walletAddress: string;
  readonly chains?: string[];
  readonly includeNfts?: boolean;
}

// ─── DeFi Strategy Types ───────────────────────────────────────────────────

export interface YieldOpportunity {
  readonly poolAddress: string;
  readonly protocol: string;
  readonly pair: string;
  readonly tvl: number;
  readonly apy: number;
  readonly baseApy: number;
  readonly rewardApy: number;
  readonly impermanentLossEstimate: number;
  readonly riskLevel: "low" | "medium" | "high";
  readonly gasEstimate: string;
  readonly liquidity: number;
  readonly volume24h: number;
}

export interface ImpermanentLossResult {
  readonly ratioA: number;
  readonly ratioB: number;
  readonly ilPercentage: number;
  readonly dollarLoss: number;
  readonly holdingVsPool: {
    readonly hold: number;
    readonly pool: number;
  };
}

export interface GasOptimization {
  readonly estimatedGas: string;
  readonly optimalTime: string;
  readonly gasSaving: number;
  readonly strategy: string;
}

export interface DefiStrategyInput {
  readonly action: "scan_yields" | "calculate_il" | "optimize_gas";
  readonly tokenA?: string;
  readonly tokenB?: string;
  readonly amountA?: number;
  readonly amountB?: number;
  readonly minTvl?: number;
  readonly maxRisk?: "low" | "medium" | "high";
}

// ─── Sentiment Types ────────────────────────────────────────────────────────

export interface SentimentScore {
  readonly token: string;
  readonly overall: number;
  readonly twitter: number;
  readonly reddit: number;
  readonly telegram: number;
  readonly news: number;
  readonly mentionCount: number;
  readonly trending: boolean;
  readonly keywords: string[];
}

export interface FearGreedIndex {
  readonly value: number;
  readonly classification: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  readonly timestamp: number;
}

export interface NewsItem {
  readonly title: string;
  readonly source: string;
  readonly url: string;
  readonly publishedAt: number;
  readonly sentiment: number;
  readonly tokensMentioned: string[];
}

export interface SentimentInput {
  readonly token?: string;
  readonly sources?: string[];
  readonly timeframe?: "1h" | "6h" | "24h" | "7d";
  readonly includeNews?: boolean;
}

// ─── Risk Guard Types ───────────────────────────────────────────────────────

export interface ContractRiskReport {
  readonly address: string;
  readonly overallRisk: "safe" | "caution" | "dangerous";
  readonly riskScore: number;
  readonly checks: RiskCheck[];
  readonly honeypotScore: number;
  readonly rugPullProbability: number;
  readonly recommendation: string;
}

export interface RiskCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly severity: "info" | "warning" | "critical";
  readonly description: string;
}

export interface HoneypotCheck {
  readonly isHoneypot: boolean;
  readonly buyTax: number;
  readonly sellTax: number;
  readonly canSell: boolean;
  readonly transferPausable: boolean;
  readonly ownerCanMint: boolean;
  readonly ownerCanBlacklist: boolean;
}

export interface RiskGuardInput {
  readonly contractAddress: string;
  readonly chain?: string;
  readonly includeBytecodeAnalysis?: boolean;
}

// ─── MCP & Configuration Types ─────────────────────────────────────────────

export interface OnchainMindConfig {
  readonly pharosRpcUrl: string;
  readonly logLevel: "debug" | "info" | "warn" | "error";
  readonly cacheTtlMs: number;
  readonly retryMaxAttempts: number;
  readonly retryBaseDelayMs: number;
  readonly mcpTransport: "stdio" | "sse";
  readonly ssePort: number;
}

export interface ChainConfig {
  readonly id: number;
  readonly name: string;
  readonly rpcUrl: string;
  readonly chainType: "evm" | "svm";
  readonly currency: {
    readonly symbol: string;
    readonly decimals: number;
  };
}

// ─── Skill Composer Types ──────────────────────────────────────────────────

export interface WorkflowStep {
  readonly skillName: string;
  readonly toolName: string;
  readonly inputMapping: Record<string, string>;
  readonly condition?: (prevResults: SkillResult[]) => boolean;
}

export interface Workflow {
  readonly name: string;
  readonly description: string;
  readonly steps: WorkflowStep[];
}

export interface WorkflowResult {
  readonly success: boolean;
  readonly results: SkillResult[];
  readonly totalExecutionTimeMs: number;
  readonly error?: string;
}
