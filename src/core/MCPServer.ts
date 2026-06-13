/**
 * OnchainMind — MCP Server Implementation
 *
 * Implements the Model Context Protocol server that exposes all registered
 * OnchainMind skills as MCP tools. Supports both stdio and SSE transports.
 *
 * Uses the @modelcontextprotocol/sdk for protocol compliance.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { IncomingMessage, ServerResponse } from "http";
// Import from "zod/v3" so the schema types match the declaration tree used by
// @modelcontextprotocol/sdk (which imports "zod/v3"); importing from the "zod"
// root resolves to a parallel .d.cts tree and triggers TS2589 deep-instantiation
// errors when the two are structurally compared. Runtime behavior is identical.
import { z } from "zod/v3";
import { skillRegistry } from "./SkillRegistry";
import { createLogger } from "../utils/logger";
import type { OnchainMindConfig } from "../utils/types";
import { requireAuth } from "../lib/resilience";

const logger = createLogger("info", "MCPServer");

/**
 * Create and configure the OnchainMind MCP Server.
 *
 * Registers all skills from the registry as MCP tools, making them
 * available to any MCP-compliant AI agent or client.
 *
 * @param config - Server configuration
 * @returns The configured MCP server instance
 */
export function createOnchainMindServer(_config: OnchainMindConfig): McpServer {
  logger.info("Initializing OnchainMind MCP Server...");

  const server = new McpServer({
    name: "onchainmind",
    version: "1.0.0",
    description:
      "OnchainMind — Composable MCP Skills for Pharos AI Agent Ecosystem. " +
      "Provides token analysis, portfolio tracking, DeFi strategy, sentiment analysis, " +
      "and risk guard skills for on-chain intelligence.",
  });

  // ─── Register all skill tools as MCP tools ──────────────────────────────

  const allTools = skillRegistry.getAllTools();
  logger.info(`Registering ${allTools.length} MCP tools from ${skillRegistry.getStats().skillCount} skills`);

  for (const { skillName, tool } of allTools) {
    const qualifiedName = `${skillName}_${tool.name}`;
    const skill = skillRegistry.get(skillName);

    if (!skill) {
      logger.warn(`Skill "${skillName}" not found for tool "${tool.name}". Skipping.`);
      continue;
    }

    server.tool(
      qualifiedName,
      tool.description,
      tool.inputSchema as Record<string, unknown>,
      async (input: Record<string, unknown>) => {
        logger.info(`MCP tool invoked: ${qualifiedName}`);

        try {
          const startTime = Date.now();
          const result = await skill.execute(tool.name, input);
          const executionTime = Date.now() - startTime;

          if (result.success) {
            logger.info(`Tool ${qualifiedName} completed in ${executionTime}ms`);
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    skill: skillName,
                    tool: tool.name,
                    success: true,
                    executionTimeMs: executionTime,
                    data: result.data,
                  }, null, 2),
                },
              ],
            };
          } else {
            logger.warn(`Tool ${qualifiedName} failed: ${result.error}`);
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    skill: skillName,
                    tool: tool.name,
                    success: false,
                    error: result.error,
                  }, null, 2),
                },
              ],
              isError: true,
            };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Tool ${qualifiedName} threw: ${errorMessage}`);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  skill: skillName,
                  tool: tool.name,
                  success: false,
                  error: errorMessage,
                }),
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  // ─── Register meta tools (skill discovery) ───────────────────────────────

  server.tool(
    "onchainmind_list_skills",
    "List all available OnchainMind skills with their descriptions, tools, and versions. Use this to discover what intelligence capabilities are available.",
    {},
    async () => {
      const summary = skillRegistry.getSummary();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              totalSkills: summary.length,
              skills: summary,
            }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "onchainmind_skill_details",
    "Get detailed information about a specific OnchainMind skill, including all available tools and their input schemas.",
    { skillName: z.string().describe("The name of the skill to inspect") },
    async (input) => {
      const name = input.skillName as string;
      const skill = skillRegistry.get(name);
      if (!skill) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: `Skill "${name}" not found`, availableSkills: skillRegistry.listNames() }),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              name: skill.name,
              description: skill.description,
              version: skill.version,
              tools: skill.tools.map((t) => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema,
              })),
            }, null, 2),
          },
        ],
      };
    }
  );

  logger.info("OnchainMind MCP Server initialized successfully");
  return server;
}

/**
 * Start the MCP server with stdio transport (default).
 * This is the standard way MCP servers communicate with AI agents.
 */
export async function startStdioServer(config: OnchainMindConfig): Promise<void> {
  const server = createOnchainMindServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("MCP Server running on stdio transport");
}

/**
 * Start the MCP server with SSE transport for HTTP-based clients.
 * Useful for web dashboards and remote agent connections.
 */
export async function startSSEServer(config: OnchainMindConfig): Promise<void> {
  const { SSEServerTransport } = await import("@modelcontextprotocol/sdk/server/sse.js");
  const server = createOnchainMindServer(config);
  const httpServer = await import("http").then((http) => http.createServer());

  // Fail-closed bearer auth for the SSE transport. The /sse and /messages
  // endpoints expose every registered skill (portfolio, DeFi strategy, risk)
  // over HTTP, so they must not be reachable unauthenticated. The expected
  // token comes from ONCHAINMIND_AUTH_TOKEN; when it is unset, requireAuth
  // returns 503 (misconfigured) and never degrades to allowing the request.
  const authToken = process.env.ONCHAINMIND_AUTH_TOKEN;

  /** Reject the Node response per a requireAuth failure; returns true if rejected. */
  const rejectIfUnauthorized = (req: IncomingMessage, res: ServerResponse): boolean => {
    const headers = new Headers();
    const authHeader = req.headers["authorization"];
    if (typeof authHeader === "string") headers.set("authorization", authHeader);

    const result = requireAuth(new Request("http://local/", { headers }), {
      token: authToken,
    });
    if (result.ok) return false;

    logger.warn(`SSE request rejected (${result.status}): ${result.reason}`);
    res.writeHead(result.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: result.reason }));
    return true;
  };

  httpServer.on("request", async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "GET" && req.url === "/sse") {
      if (rejectIfUnauthorized(req, res)) return;
      const sseTransport = new SSEServerTransport("/messages", res);
      await server.connect(sseTransport);
      logger.info(`SSE client connected (transport: /messages)`);
    } else if (req.method === "POST" && req.url === "/messages") {
      if (rejectIfUnauthorized(req, res)) return;
      // Handle POST messages — handled by SSEServerTransport internally
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        name: "onchainmind",
        version: "1.0.0",
        status: "running",
        transport: "sse",
        skills: skillRegistry.getStats(),
      }));
    }
  });

  httpServer.listen(config.ssePort, () => {
    logger.info(`MCP Server running on SSE transport (port ${config.ssePort})`);
  });
}
