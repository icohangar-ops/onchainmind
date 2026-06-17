# OnchainMind — Composable MCP Skills for Pharos AI Agents

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-1.0-00C853?logo=protocol&logoColor=white)
![Pharos](https://img.shields.io/badge/Pharos-Phase%201-7C3AED)
![AI](https://img.shields.io/badge/AI-Agent_Skills-FF6D00)
![Web3](https://img.shields.io/badge/Web3-On--Chain-0097A7)
![MIT](https://img.shields.io/badge/License-MIT-green)

> **Pharos Phase 1 Skill Hackathon** — A modular MCP server that exposes composable AI skills for on-chain intelligence, purpose-built for the Pharos AI Agent ecosystem.

---

## Overview

OnchainMind is a **Model Context Protocol (MCP) server** that provides a suite of composable, pluggable AI skills for Pharos AI agents. Instead of building monolithic agents, OnchainMind decomposes on-chain intelligence into discrete, reusable skills — from token analysis and portfolio tracking to DeFi strategy, sentiment analysis, and contract risk scanning. Each skill is a self-contained module implementing a standardized `Skill` interface, exposing typed MCP tools that any MCP-compliant AI agent can discover and invoke.

The MCP standard enables **plug-and-play composability**: agents can consume individual skills, chain them into multi-step workflows via the built-in `SkillComposer`, or use pre-registered pipeline workflows like "Sentiment-Aware Yield Hunting" and "Safe Token Discovery." This means a Pharos AI agent can, with a single MCP connection, access deep on-chain analytics, cross-reference social sentiment, validate contract safety, scan for yield opportunities, and track portfolio performance — all through a unified tool interface.

OnchainMind is designed as the **intelligence layer for Pharos AI Agents**. It integrates directly with Pharos RPC via the `PharosAdapter`, supports both stdio and SSE MCP transports for flexible deployment, and ships with retry logic, TTL caching, and structured logging out of the box. Whether you're building a trading bot, a yield optimizer, or a portfolio advisor, OnchainMind provides the foundational skills your agent needs to make informed on-chain decisions.

---

## Skill Catalog

| Skill | Description | Key Tools | Input | Output |
|-------|-------------|-----------|-------|--------|
| **Token Analysis** | Real-time token metrics, price tracking, liquidity depth, whale monitoring | `get_metrics`, `get_price_history`, `track_whales`, `analyze_liquidity` | Token address, chain, timeframe | Price, volume, liquidity depth, whale alerts, trend analysis |
| **Portfolio** | Cross-chain portfolio aggregation, PnL, risk scoring (Sharpe-like), allocation | `aggregate`, `calculate_pnl`, `risk_score`, `allocation` | Wallet address, chains | Total value, positions, PnL, risk score, allocation breakdown |
| **DeFi Strategy** | Yield farming scan, impermanent loss calculation, gas optimization, pool comparison | `scan_yields`, `calculate_il`, `optimize_gas`, `compare_pools` | Min TVL, risk level, token pairs | Yield opportunities, IL analysis, gas strategies |
| **Sentiment** | Social sentiment scoring (Twitter/Reddit/Telegram/News), Fear & Greed, news aggregation | `analyze_sentiment`, `get_fear_greed`, `aggregate_news` | Token address, timeframe | Composite sentiment score, Fear & Greed index, news items |
| **Risk Guard** | Contract risk scanning, honeypot detection, ownership verification, bytecode analysis | `scan_contract`, `check_honeypot`, `verify_ownership` | Contract address | Risk report, honeypot check, ownership status |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MCP Client (AI Agent)                           │
│                     Claude / GPT / Custom                            │
└──────────────────────┬──────────────────────────────────────────────┘
                       │  MCP Protocol (stdio / SSE)
                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     OnchainMind MCP Server                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    SkillRegistry                                │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │ │
│  │  │TokenAnalysis │ │  Portfolio   │ │DefiStrategy  │            │ │
│  │  │   Skill      │ │   Skill      │ │   Skill      │            │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘            │ │
│  │  ┌──────────────┐ ┌──────────────┐                              │ │
│  │  │  Sentiment   │ │ RiskGuard    │                              │ │
│  │  │   Skill      │ │   Skill      │                              │ │
│  │  └──────────────┘ └──────────────┘                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    SkillComposer                                │ │
│  │  chain() / registerWorkflow() / executeWorkflow()              │ │
│  │  ──────────────────────────────────────────────                │ │
│  │  [Sentiment] → [TokenAnalysis] → [DefiStrategy]                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    PharosAdapter                               │ │
│  │  RPC calls / Event logs / Contract reads / Bytecode analysis   │ │
│  │  ──────────────────────────────────────────────                │ │
│  │  Pharos Testnet (Chain ID: 688)                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                     │
│  │   Cache    │ │   Retry    │ │   Logger   │                     │
│  │ TTL-based  │ │ Exponential│ │ Structured │                     │
│  └────────────┘ └────────────┘ └────────────┘                     │
└──────────────────────────────────────────────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Pharos Network │
              │  (Chain ID: 688)│
              └─────────────────┘
```

---

## Why OnchainMind?

| # | Differentiator | Detail |
|---|----------------|--------|
| 1 | **Composable by Design** | Skills are independent, composable modules — not a monolithic agent. Mix, match, and chain as needed. |
| 2 | **MCP Standard Native** | Built directly on the Model Context Protocol. Zero custom glue code — any MCP client works instantly. |
| 3 | **Pharos-First Integration** | `PharosAdapter` provides first-class Pharos RPC support with chain-aware configuration and bytecode analysis. |
| 4 | **Production-Grade Infrastructure** | TTL caching, exponential retry with jitter, structured logging, graceful shutdown — not a hackathon prototype. |
| 5 | **Workflow Engine Built-In** | `SkillComposer` enables multi-step pipelines with conditional branching, input mapping, and automatic passthrough. |

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Access to Pharos RPC (testnet or mainnet)

### Installation

```bash
# Clone the repository
git clone https://github.com/icohangar-ops/onchainmind.git
cd onchainmind

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the MCP server (stdio transport)
npm start
```

### MCP Client Configuration

Add OnchainMind to your MCP client's configuration:

```json
{
  "mcpServers": {
    "onchainmind": {
      "command": "node",
      "args": ["/path/to/onchainmind/dist/index.js"],
      "env": {
        "ONCHAINMIND_PHAROS_RPC_URL": "https://testnet.pharosnetwork.xyz",
        "ONCHAINMIND_LOG_LEVEL": "info"
      }
    }
  }
}
```

For SSE transport:

```json
{
  "mcpServers": {
    "onchainmind": {
      "url": "http://localhost:3002"
    }
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ONCHAINMIND_PHAROS_RPC_URL` | `https://testnet.pharosnetwork.xyz` | Pharos RPC endpoint |
| `ONCHAINMIND_LOG_LEVEL` | `info` | Log level (debug/info/warn/error) |
| `ONCHAINMIND_MCP_TRANSPORT` | `stdio` | Transport mode (stdio/sse) |
| `ONCHAINMIND_SSE_PORT` | `3002` | SSE server port |
| `ONCHAINMIND_CACHE_TTL_MS` | `30000` | Cache TTL in milliseconds |
| `ONCHAINMIND_RETRY_MAX_ATTEMPTS` | `3` | Max retry attempts |
| `ONCHAINMIND_AUTH_TOKEN` | (unset) | Bearer token for the SSE transport. Required when transport is `sse`; the SSE endpoints fail closed with HTTP 503 when it is unset. Unused for stdio. |

See [.env.example](./.env.example) for a copyable template.

---

## Skill API Reference

### Token Analysis Skill (`token_analysis`)

#### `get_metrics`
Get comprehensive token metrics.

**Input:**
```json
{ "tokenAddress": "0x...", "chain": "pharos" }
```
**Output:** Price, volume, liquidity, holders, transactions, liquidity depth.

#### `get_price_history`
Fetch price history with volatility and trend analysis.

**Input:**
```json
{ "tokenAddress": "0x...", "points": 24, "timeframe": "24h" }
```
**Output:** Price points array, volatility %, trend (bullish/bearish/sideways), high/low.

#### `track_whales`
Monitor large holder movements.

**Input:**
```json
{ "tokenAddress": "0x...", "thresholdUsd": 100000 }
```
**Output:** Whale alerts array, buy/sell volume summary, net flow.

#### `analyze_liquidity`
Deep liquidity depth analysis.

**Input:**
```json
{ "tokenAddress": "0x...", "pairAddress": "0x..." }
```
**Output:** Liquidity at various slippage levels (0.1%, 0.5%, 1%, 5%), slippage warning.

---

### Portfolio Skill (`portfolio`)

#### `aggregate`
Aggregate all positions across chains.

**Input:**
```json
{ "walletAddress": "0x...", "chains": ["pharos", "ethereum", "bsc"] }
```
**Output:** Total value, positions array, allocation by chain/protocol, risk metrics.

#### `calculate_pnl`
Calculate profit/loss breakdown.

**Input:**
```json
{ "walletAddress": "0x..." }
```
**Output:** Total PnL, per-token PnL, realized vs unrealized breakdown.

#### `risk_score`
Portfolio risk assessment.

**Input:**
```json
{ "walletAddress": "0x..." }
```
**Output:** Risk score (0-100), Sharpe-like ratio, max drawdown, diversification score.

#### `allocation`
Allocation analysis.

**Input:**
```json
{ "walletAddress": "0x..." }
```
**Output:** Breakdown by chain, protocol, and token.

---

### DeFi Strategy Skill (`defi_strategy`)

#### `scan_yields`
Scan for yield farming opportunities.

**Input:**
```json
{ "minTvl": 100000, "maxRisk": "medium", "minApy": 0 }
```
**Output:** Pool list with APY, TVL, risk level, IL estimate, gas estimate.

#### `calculate_il`
Calculate impermanent loss.

**Input:**
```json
{ "priceChangeA": 1.5, "priceChangeB": 1.0, "amountA": 1000, "amountB": 1000 }
```
**Output:** IL %, dollar loss, holding vs pool value, net analysis with fee income.

#### `optimize_gas`
Gas optimization strategies.

**Input:**
```json
{ "transactionType": "swap" }
```
**Output:** Estimated gas, optimal timing, savings %, multicall batching savings.

#### `compare_pools`
Compare pools side by side.

**Input:**
```json
{ "pairs": ["PROS/USDT", "PROS/WETH"] }
```
**Output:** Pool comparisons with best protocol recommendation per pair.

---

### Sentiment Skill (`sentiment`)

#### `analyze_sentiment`
Composite sentiment score from social + on-chain signals.

**Input:**
```json
{ "tokenAddress": "0x...", "timeframe": "24h" }
```
**Output:** Composite score (0-100), per-source scores, mention count, trending flag, keywords.

#### `get_fear_greed`
Market Fear & Greed Index.

**Input:**
```json
{}
```
**Output:** Value (0-100), classification (Extreme Fear → Extreme Greed), recommendation.

#### `aggregate_news`
Aggregate crypto news with sentiment.

**Input:**
```json
{ "tokenAddress": "0x...", "maxArticles": 10 }
```
**Output:** News articles array, average sentiment, positive/negative counts.

---

### Risk Guard Skill (`risk_guard`)

#### `scan_contract`
Full contract risk scan.

**Input:**
```json
{ "contractAddress": "0x...", "chain": "pharos" }
```
**Output:** Risk report with checks (honeypot, owner, mint, blacklist, pause, liquidity), risk score, rug pull probability.

#### `check_honeypot`
Quick honeypot detection.

**Input:**
```json
{ "contractAddress": "0x..." }
```
**Output:** isHoneypot boolean, buy/sell tax, canSell, owner privileges.

#### `verify_ownership`
Ownership and privilege verification.

**Input:**
```json
{ "contractAddress": "0x..." }
```
**Output:** Owner renounced, mint/blacklist/pause status, fee modifiability, verdict.

---

## Composability: Skill Chaining

The `SkillComposer` enables multi-step workflows where output from one skill flows into the next:

```typescript
import { skillComposer } from "./core/SkillComposer";

// Define a workflow: Sentiment → Token Analysis → Yield Scan
const workflow = skillComposer.chain([
  { skillName: "sentiment", toolName: "analyze_sentiment" },
  { skillName: "token_analysis", toolName: "get_metrics" },
  { skillName: "defi_strategy", toolName: "scan_yields" },
]);

// Register for later use
skillComposer.registerWorkflow(workflow);

// Execute with initial input
const result = await skillComposer.executeWorkflow("chained-...", {
  tokenAddress: "0x...",
  timeframe: "24h",
});
```

### Pre-Built Workflows

OnchainMind ships with 3 pre-built workflows:

| Workflow | Steps | Use Case |
|----------|-------|----------|
| **Sentiment Yield Hunt** | Sentiment → Token Analysis → Yield Scan | Find high-yield pools for tokens with positive sentiment |
| **Safe Token Discovery** | Token Analysis → Risk Scan → Sentiment | Discover new tokens that pass all safety checks |
| **Portfolio Risk Assessment** | Portfolio Aggregate → Risk Score → Yield Scan | Assess current portfolio risk and find yield opportunities |

---

## Example: Agent Integration

```typescript
// An AI agent using OnchainMind via MCP
// The agent calls MCP tools which route to skills:

// 1. Check market sentiment
const sentiment = await mcpClient.callTool("sentiment_analyze_sentiment", {
  tokenAddress: "0x...",
});

// 2. If bullish, scan the contract for safety
if (sentiment.data.overall > 60) {
  const risk = await mcpClient.callTool("risk_guard_scan_contract", {
    contractAddress: "0x...",
  });

  // 3. If safe, analyze token and find yields
  if (risk.data.overallRisk === "safe") {
    const metrics = await mcpClient.callTool("token_analysis_get_metrics", {
      tokenAddress: "0x...",
    });

    const yields = await mcpClient.callTool("defi_strategy_scan_yields", {
      minTvl: 50000,
      maxRisk: "low",
    });

    // Agent now has all data to make an informed recommendation
  }
}
```

---

## Pharos Integration

OnchainMind is designed with **first-class Pharos support**:

- **PharosAdapter**: Abstracts all Pharos RPC interactions (block fetching, transaction receipts, event logs, contract calls, bytecode retrieval, gas estimation)
- **Chain Configuration**: Pre-configured for Pharos Testnet (Chain ID: 688, PROS currency)
- **Bytecode Analysis**: Built-in pattern detection for honeypot scanning using `eth_getCode`
- **Event Monitoring**: Real-time event log filtering for whale tracking and protocol interactions
- **Gas Optimization**: Pharos-specific gas estimation and optimal timing recommendations

### Configuration for Pharos Mainnet

```json
{
  "pharosRpcUrl": "https://mainnet.pharosnetwork.xyz",
  "pharosChainId": 688,
  "pharosChainName": "Pharos Mainnet"
}
```

---

## Directory Structure

```
onchainmind/
├── src/
│   ├── index.ts                          # MCP server entry point
│   ├── core/
│   │   ├── MCPServer.ts                  # MCP server with stdio + SSE
│   │   ├── SkillRegistry.ts              # Central skill registry
│   │   ├── SkillComposer.ts             # Workflow engine / chaining
│   │   └── PharosAdapter.ts             # Pharos RPC abstraction
│   ├── skills/
│   │   ├── TokenAnalysisSkill.ts         # Token metrics + whale tracking
│   │   ├── PortfolioSkill.ts             # Portfolio aggregation + risk
│   │   ├── DefiStrategySkill.ts         # Yield scanning + IL + gas
│   │   ├── SentimentSkill.ts            # Social sentiment + news
│   │   └── RiskGuardSkill.ts            # Contract risk + honeypot scan
│   ├── utils/
│   │   ├── types.ts                     # All shared TypeScript types
│   │   ├── config.ts                    # Config loader (JSON + env)
│   │   ├── logger.ts                    # Structured logging
│   │   ├── cache.ts                     # TTL in-memory cache
│   │   └── retry.ts                     # Exponential backoff retry
│   └── config/
│       └── default.json                 # Default configuration
├── examples/
│   ├── single-skill-usage.ts            # Using one skill standalone
│   ├── skill-chaining.ts               # Sentiment → Token → Yield
│   └── custom-workflow.ts              # Conditional branching workflow
├── Dockerfile                           # Docker container
├── docker-compose.yml                   # Docker compose
├── package.json                         # Project manifest
├── tsconfig.json                        # TypeScript config
├── LICENSE                              # MIT License
└── README.md                            # This file
```

---

## Phase 2 Roadmap: Agent Arena Entry

- [ ] **Autonomous Agent Mode** — Self-directed skill execution based on market events
- [ ] **Real-time WebSocket feeds** — Pharos event streaming for instant whale/sentiment updates
- [ ] **Multi-chain expansion** — Ethereum, BSC, Solana adapter modules
- [ ] **Backtesting Engine** — Historical workflow replay for strategy validation
- [ ] **Skill Marketplace** — Community-contributed skills with verification
- [ ] **Agent Arena Entry** — Compete in Pharos autonomous agent competitions

---

## License

MIT License — see [LICENSE](./LICENSE) for details.

---

Built for the Pharos AI Agent Ecosystem — **Pharos Phase 1 Skill Hackathon**
