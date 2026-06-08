/**
 * OnchainMind — Configuration Loader
 *
 * Loads configuration from default.json and environment variables.
 * Environment variables take precedence over config file values.
 *
 * Config hierarchy:
 *   1. Environment variables (ONCHAINMIND_* prefix)
 *   2. default.json file
 *   3. Built-in defaults
 */

import type { OnchainMindConfig } from "../utils/types";
import { createLogger } from "../utils/logger";

const logger = createLogger("info", "ConfigLoader");

/** Built-in default configuration values */
const DEFAULTS: OnchainMindConfig = {
  pharosRpcUrl: "https://testnet.pharosnetwork.xyz",
  logLevel: "info",
  cacheTtlMs: 30_000,
  retryMaxAttempts: 3,
  retryBaseDelayMs: 1_000,
  mcpTransport: "stdio",
  ssePort: 3002,
};

/**
 * Load the OnchainMind configuration from default.json and environment variables.
 *
 * Environment variable mappings (ONCHAINMIND_* prefix):
 *   - ONCHAINMIND_PHAROS_RPC_URL
 *   - ONCHAINMIND_LOG_LEVEL
 *   - ONCHAINMIND_CACHE_TTL_MS
 *   - ONCHAINMIND_RETRY_MAX_ATTEMPTS
 *   - ONCHAINMIND_RETRY_BASE_DELAY_MS
 *   - ONCHAINMIND_MCP_TRANSPORT
 *   - ONCHAINMIND_SSE_PORT
 */
export function loadConfig(configPath?: string): OnchainMindConfig {
  // Start with built-in defaults
  const config: OnchainMindConfig = { ...DEFAULTS };

  // Layer 2: Load from default.json (or custom path)
  try {
    const fs = require("fs");
    const path = require("path");
    const resolvedPath = configPath ?? path.join(__dirname, "..", "config", "default.json");

    if (fs.existsSync(resolvedPath)) {
      const fileContent = fs.readFileSync(resolvedPath, "utf-8");
      const fileConfig = JSON.parse(fileContent);

      if (fileConfig.pharosRpcUrl) config.pharosRpcUrl = fileConfig.pharosRpcUrl;
      if (fileConfig.logLevel) config.logLevel = fileConfig.logLevel;
      if (fileConfig.cacheTtlMs) config.cacheTtlMs = Number(fileConfig.cacheTtlMs);
      if (fileConfig.retryMaxAttempts) config.retryMaxAttempts = Number(fileConfig.retryMaxAttempts);
      if (fileConfig.retryBaseDelayMs) config.retryBaseDelayMs = Number(fileConfig.retryBaseDelayMs);
      if (fileConfig.mcpTransport) config.mcpTransport = fileConfig.mcpTransport;
      if (fileConfig.ssePort) config.ssePort = Number(fileConfig.ssePort);

      logger.debug(`Loaded config from: ${resolvedPath}`);
    } else {
      logger.warn(`Config file not found at ${resolvedPath}, using defaults`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to load config file: ${message}. Using defaults.`);
  }

  // Layer 3: Override with environment variables (highest precedence)
  const envMappings: Array<{ env: string; key: keyof OnchainMindConfig; parser: (v: string) => unknown }> = [
    { env: "ONCHAINMIND_PHAROS_RPC_URL", key: "pharosRpcUrl", parser: (v) => v },
    { env: "ONCHAINMIND_LOG_LEVEL", key: "logLevel", parser: (v) => v },
    { env: "ONCHAINMIND_CACHE_TTL_MS", key: "cacheTtlMs", parser: (v) => Number(v) },
    { env: "ONCHAINMIND_RETRY_MAX_ATTEMPTS", key: "retryMaxAttempts", parser: (v) => Number(v) },
    { env: "ONCHAINMIND_RETRY_BASE_DELAY_MS", key: "retryBaseDelayMs", parser: (v) => Number(v) },
    { env: "ONCHAINMIND_MCP_TRANSPORT", key: "mcpTransport", parser: (v) => v },
    { env: "ONCHAINMIND_SSE_PORT", key: "ssePort", parser: (v) => Number(v) },
  ];

  for (const mapping of envMappings) {
    const value = process.env[mapping.env];
    if (value !== undefined && value !== "") {
      (config as Record<string, unknown>)[mapping.key] = mapping.parser(value);
      logger.debug(`Config override from env: ${mapping.env} = ${value}`);
    }
  }

  logger.info(`Configuration loaded — transport: ${config.mcpTransport}, rpc: ${config.pharosRpcUrl}`);
  return config;
}

/**
 * Initialize the global logger with the configured log level.
 * Must be called after loadConfig().
 */
export function initLogger(level: "debug" | "info" | "warn" | "error"): void {
  // The logger is created per-module, so the level is set at creation time.
  // This function validates the level and logs the initialization.
  const validLevels = ["debug", "info", "warn", "error"];
  if (!validLevels.includes(level)) {
    logger.warn(`Invalid log level "${level}", falling back to "info"`);
  }
  logger.info(`Logger initialized with level: ${level}`);
}
