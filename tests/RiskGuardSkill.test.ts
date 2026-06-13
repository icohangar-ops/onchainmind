/**
 * Tests for src/skills/RiskGuardSkill.ts execute() — happy and error paths.
 *
 * RiskGuardSkill is the skill coupled to PharosAdapter (it imports it and threads
 * an adapter into bytecode analysis), so we mock the PharosAdapter module here to
 * keep the test hermetic and to exercise the adapter seam. The current skill
 * computes deterministically from the address, so identical inputs yield stable,
 * well-formed reports.
 */

// Mock the PharosAdapter so the skill never performs real RPC/network I/O.
const getCode = jest.fn(async () => "0xa9059cbb40c10f19");
jest.mock("../src/core/PharosAdapter", () => ({
  PharosAdapter: jest.fn().mockImplementation(() => ({
    getCode,
    getChainId: jest.fn(async () => 688),
    isConnected: jest.fn(async () => true),
  })),
}));

import { RiskGuardSkill } from "../src/skills/RiskGuardSkill";

describe("RiskGuardSkill.execute (mocked PharosAdapter)", () => {
  const ADDR = "0x1234567890abcdef1234567890abcdef12345678";

  it("happy path: scan_contract returns a well-formed risk report", async () => {
    const result = await RiskGuardSkill.execute("scan_contract", { contractAddress: ADDR });

    expect(result.success).toBe(true);
    expect(result.skillName).toBe("risk_guard");
    expect(result.toolName).toBe("scan_contract");
    expect(["safe", "caution", "dangerous"]).toContain(result.data.overallRisk);
    expect(typeof result.data.riskScore).toBe("number");
    expect(result.data.riskScore as number).toBeGreaterThanOrEqual(0);
    expect(result.data.riskScore as number).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.data.checks)).toBe(true);
    expect((result.data.checks as unknown[]).length).toBeGreaterThan(0);
    expect(typeof result.data.recommendation).toBe("string");
  });

  it("happy path: scan_contract is deterministic and served from cache on repeat", async () => {
    const first = await RiskGuardSkill.execute("scan_contract", { contractAddress: ADDR });
    const second = await RiskGuardSkill.execute("scan_contract", { contractAddress: ADDR });

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    // Second call hits the riskCache.
    expect(second.data.cached).toBe(true);
    expect(second.data.riskScore).toBe(first.data.riskScore);
  });

  it("happy path: check_honeypot returns a verdict and tax fields", async () => {
    const result = await RiskGuardSkill.execute("check_honeypot", { contractAddress: ADDR });
    expect(result.success).toBe(true);
    expect(typeof result.data.isHoneypot).toBe("boolean");
    expect(typeof result.data.buyTax).toBe("number");
    expect(typeof result.data.sellTax).toBe("number");
    expect(typeof result.data.verdict).toBe("string");
  });

  it("happy path: verify_ownership reports privilege status", async () => {
    const result = await RiskGuardSkill.execute("verify_ownership", { contractAddress: ADDR });
    expect(result.success).toBe(true);
    expect(typeof result.data.ownerRenounced).toBe("boolean");
    expect(result.data.details).toBeDefined();
  });

  it("error path: missing contractAddress fails closed with a clear error", async () => {
    const result = await RiskGuardSkill.execute("scan_contract", {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("contractAddress is required");
    expect(result.data).toEqual({});
  });

  it("error path: unknown tool returns a descriptive error", async () => {
    const result = await RiskGuardSkill.execute("not_a_real_tool", { contractAddress: ADDR });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown tool");
  });
});
