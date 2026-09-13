/**
 * Tests for src/utils/config.ts — default/in-tree loads stay valid, and
 * paths that escape the project root are rejected (no file inclusion).
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { loadConfig } from "../src/utils/config";

const DEFAULT_RPC = "https://testnet.pharosnetwork.xyz";

describe("loadConfig path confinement", () => {
  it("loads the in-tree default.json when no path is given", () => {
    const config = loadConfig();
    expect(config.pharosRpcUrl).toBe(DEFAULT_RPC);
    expect(config.mcpTransport).toBe("stdio");
    expect(config.ssePort).toBe(3002);
  });

  it("loads a legitimate in-tree path, including a .. that stays inside the repo", () => {
    const inTree = path.join("src", "utils", "..", "config", "default.json");
    const config = loadConfig(inTree);
    expect(config.pharosRpcUrl).toBe(DEFAULT_RPC);
    expect(config.retryMaxAttempts).toBe(3);
  });

  it("rejects an absolute path outside the project root", () => {
    const tmp = path.join(os.tmpdir(), `onchainmind-evil-${process.pid}.json`);
    fs.writeFileSync(tmp, JSON.stringify({ pharosRpcUrl: "https://evil.example" }));
    try {
      const config = loadConfig(tmp);
      expect(config.pharosRpcUrl).toBe(DEFAULT_RPC);
      expect(config.pharosRpcUrl).not.toBe("https://evil.example");
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it("rejects a relative path that escapes the project root with ..", () => {
    const tmp = path.join(os.tmpdir(), `onchainmind-trav-${process.pid}.json`);
    fs.writeFileSync(tmp, JSON.stringify({ pharosRpcUrl: "https://traversed.example" }));
    try {
      const relativeEscape = path.relative(process.cwd(), tmp);
      expect(relativeEscape.split(path.sep)[0]).toBe("..");
      const config = loadConfig(relativeEscape);
      expect(config.pharosRpcUrl).toBe(DEFAULT_RPC);
      expect(config.pharosRpcUrl).not.toBe("https://traversed.example");
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});
