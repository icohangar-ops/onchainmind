/**
 * OnchainMind — Logger Utility
 *
 * Structured logging with configurable levels and timestamp formatting.
 * Designed for both MCP stdio transport and SSE server modes.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: string;
  readonly data?: Record<string, unknown>;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private currentLevel: LogLevel;
  private context?: string;

  constructor(level: LogLevel = "info", context?: string) {
    this.currentLevel = level;
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.currentLevel];
  }

  private formatEntry(entry: LogEntry): string {
    const contextStr = entry.context ? ` [${entry.context}]` : "";
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : "";
    return `[${entry.timestamp}] ${entry.level.toUpperCase()}${contextStr}: ${entry.message}${dataStr}`;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      data,
    };

    const formatted = this.formatEntry(entry);

    switch (level) {
      case "error":
        process.stderr.write(formatted + "\n");
        break;
      default:
        process.stdout.write(formatted + "\n");
        break;
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log("error", message, data);
  }

  child(context: string): Logger {
    return new Logger(this.currentLevel, context);
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }
}

/** Create the global logger instance */
export function createLogger(level: LogLevel = "info", context?: string): Logger {
  return new Logger(level, context);
}
