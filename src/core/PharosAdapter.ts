/**
 * OnchainMind — Pharos Network Adapter
 *
 * Abstracts Pharos RPC calls, event subscriptions, and contract interactions.
 * Designed to be chain-agnostic internally, with Pharos as the primary target.
 * Uses ethers.js v6 for provider abstraction.
 */

import { type Logger, createLogger } from "../utils/logger";
import { withRetry } from "../utils/retry";
import type { ChainConfig } from "../utils/types";

interface TransactionReceipt {
  readonly hash: string;
  readonly blockNumber: number;
  readonly status: "success" | "reverted";
  readonly gasUsed: string;
  readonly from: string;
  readonly to: string | null;
}

interface BlockInfo {
  readonly number: number;
  readonly timestamp: number;
  readonly hash: string;
  readonly gasUsed: string;
  readonly gasLimit: string;
  readonly transactionCount: number;
}

interface EventLog {
  readonly address: string;
  readonly topics: string[];
  readonly data: string;
  readonly blockNumber: number;
  readonly transactionHash: string;
  readonly logIndex: number;
}

export class PharosAdapter {
  private readonly rpcUrl: string;
  private readonly chainConfig: ChainConfig;
  private readonly logger: Logger;
  private readonly requestTimeout: number;

  constructor(rpcUrl: string, chainConfig?: ChainConfig) {
    this.rpcUrl = rpcUrl;
    this.chainConfig = chainConfig ?? {
      id: 688,
      name: "Pharos Testnet",
      rpcUrl,
      chainType: "evm",
      currency: { symbol: "PROS", decimals: 18 },
    };
    this.logger = createLogger("info", "PharosAdapter");
    this.requestTimeout = 15_000;
  }

  /**
   * Execute an RPC call with retry logic
   */
  private async rpcCall(method: string, params: unknown[]): Promise<unknown> {
    return withRetry(
      async () => {
        const response = await fetch(this.rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method,
            params,
          }),
          signal: AbortSignal.timeout(this.requestTimeout),
        });

        if (!response.ok) {
          throw new Error(`RPC call failed: HTTP ${response.status}`);
        }

        const json = await response.json() as { result?: unknown; error?: { message: string } };
        if (json.error) {
          throw new Error(`RPC error: ${json.error.message}`);
        }

        return json.result;
      },
      { maxAttempts: 3, baseDelayMs: 500 }
    );
  }

  /**
   * Get the latest block number
   */
  async getLatestBlockNumber(): Promise<number> {
    const result = await this.rpcCall("eth_blockNumber", []);
    const hex = result as string;
    return parseInt(hex, 16);
  }

  /**
   * Get block information by number
   */
  async getBlock(blockNumber: number): Promise<BlockInfo> {
    const result = await this.rpcCall("eth_getBlockByNumber", [
      `0x${blockNumber.toString(16)}`,
      false,
    ]) as Record<string, unknown>;

    return {
      number: parseInt((result.number as string), 16),
      timestamp: parseInt((result.timestamp as string), 16),
      hash: result.hash as string,
      gasUsed: result.gasUsed as string,
      gasLimit: result.gasLimit as string,
      transactionCount: Array.isArray(result.transactions) ? result.transactions.length : 0,
    };
  }

  /**
   * Get a transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null> {
    const result = await this.rpcCall("eth_getTransactionReceipt", [txHash]) as Record<string, unknown> | null;

    if (!result) return null;

    return {
      hash: result.hash as string,
      blockNumber: parseInt((result.blockNumber as string), 16),
      status: parseInt((result.status as string), 16) === 1 ? "success" : "reverted",
      gasUsed: result.gasUsed as string,
      from: result.from as string,
      to: result.to as string | null,
    };
  }

  /**
   * Get ETH/PROS balance for an address
   */
  async getBalance(address: string): Promise<bigint> {
    const result = await this.rpcCall("eth_getBalance", [address, "latest"]);
    return BigInt(result as string);
  }

  /**
   * Get contract code at address (used for honeypot detection)
   */
  async getCode(address: string): Promise<string> {
    const result = await this.rpcCall("eth_getCode", [address, "latest"]);
    return result as string;
  }

  /**
   * Call a smart contract function (read-only)
   */
  async call(
    to: string,
    data: string,
    from?: string
  ): Promise<string> {
    const params: unknown[] = [to, data, "latest"];
    if (from) {
      params.splice(2, 0, from);
    }
    const result = await this.rpcCall("eth_call", params);
    return result as string;
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(
    to: string,
    data: string,
    from?: string
  ): Promise<bigint> {
    const params: unknown[] = [{ to, data }];
    if (from) {
      (params[0] as Record<string, string>).from = from;
    }
    const result = await this.rpcCall("eth_estimateGas", params);
    return BigInt(result as string);
  }

  /**
   * Get logs matching a filter (event subscription)
   */
  async getLogs(
    address: string | undefined,
    topics: (string | null)[],
    fromBlock?: number,
    toBlock?: number
  ): Promise<EventLog[]> {
    const filter: Record<string, unknown> = {
      address: address ?? undefined,
      topics: topics.length > 0 ? topics : undefined,
      fromBlock: fromBlock ? `0x${fromBlock.toString(16)}` : undefined,
      toBlock: toBlock ? `0x${toBlock.toString(16)}` : undefined,
    };

    const results = await this.rpcCall("eth_getLogs", [filter]) as Array<Record<string, unknown>>;

    return results.map((r) => ({
      address: r.address as string,
      topics: r.topics as string[],
      data: r.data as string,
      blockNumber: parseInt((r.blockNumber as string), 16),
      transactionHash: r.transactionHash as string,
      logIndex: parseInt((r.logIndex as string), 16),
    }));
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    const result = await this.rpcCall("eth_gasPrice", []);
    return BigInt(result as string);
  }

  /**
   * Get the chain ID
   */
  async getChainId(): Promise<number> {
    const result = await this.rpcCall("eth_chainId", []);
    return parseInt(result as string, 16);
  }

  /**
   * Get the chain configuration
   */
  getChainConfig(): ChainConfig {
    return this.chainConfig;
  }

  /**
   * Verify connection to Pharos RPC
   */
  async isConnected(): Promise<boolean> {
    try {
      const chainId = await this.getChainId();
      this.logger.info(`Connected to Pharos (chainId: ${chainId})`);
      return chainId === this.chainConfig.id;
    } catch {
      this.logger.warn("Failed to connect to Pharos RPC");
      return false;
    }
  }

  /**
   * Perform basic bytecode analysis for risk detection
   */
  analyzeBytecode(bytecode: string): {
    hasSelfDestruct: boolean;
    hasDelegateCall: boolean;
    hasProxyPattern: boolean;
    hasUnverifiedCode: boolean;
    bytecodeLength: number;
    opcodes: string[];
  } {
    const patterns: Array<{ name: string; pattern: RegExp }> = [
      { name: "SELFDESTRUCT", pattern: /ff/i },
      { name: "DELEGATECALL", pattern: /f4/i },
      { name: "CREATE", pattern: /f0/i },
      { name: "CREATE2", pattern: /f5/i },
    ];

    const opcodes: string[] = [];
    for (const p of patterns) {
      if (p.pattern.test(bytecode)) {
        opcodes.push(p.name);
      }
    }

    return {
      hasSelfDestruct: /ff/i.test(bytecode),
      hasDelegateCall: /f4/i.test(bytecode),
      hasProxyPattern: /5c5c5c/i.test(bytecode) || bytecode.length < 200,
      hasUnverifiedCode: bytecode.length < 100,
      bytecodeLength: bytecode.length,
      opcodes,
    };
  }
}
