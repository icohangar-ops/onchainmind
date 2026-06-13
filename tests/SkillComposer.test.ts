/**
 * Tests for src/core/SkillComposer.ts — step ordering, conditional skipping,
 * data pass-through between steps, and failure/short-circuit behavior.
 *
 * SkillComposer resolves skills from the shared skillRegistry singleton, so we
 * register lightweight fake skills there.
 */
import { skillComposer } from "../src/core/SkillComposer";
import { skillRegistry } from "../src/core/SkillRegistry";
import type { Skill, SkillResult, Workflow } from "../src/utils/types";

/** Build a fake skill whose execute() records the order it ran in. */
function makeSkill(
  name: string,
  execImpl: (toolName: string, input: Record<string, unknown>) => Promise<SkillResult>,
): Skill {
  return {
    name,
    description: `fake ${name}`,
    version: "1.0.0",
    tools: [{ name: "run", description: "run", inputSchema: { type: "object" } }],
    execute: jest.fn(execImpl),
  };
}

function ok(skillName: string, toolName: string, data: Record<string, unknown>): SkillResult {
  return { success: true, data, executionTimeMs: 1, skillName, toolName };
}

describe("SkillComposer", () => {
  const order: string[] = [];

  beforeEach(() => {
    order.length = 0;
    // Reset registry state between tests (no public clear, so reach in).
    (skillRegistry as unknown as { skills: Map<string, Skill> }).skills.clear();
    (skillRegistry as unknown as { toolIndex: Map<string, unknown> }).toolIndex.clear();
    (skillComposer as unknown as { workflows: Map<string, Workflow> }).workflows.clear();
  });

  it("executes steps in declared order, threading data forward", async () => {
    skillRegistry.register(
      makeSkill("first", async (tool) => {
        order.push("first");
        return ok("first", tool, { token: "PROS", step1: true });
      }),
    );
    skillRegistry.register(
      makeSkill("second", async (tool, input) => {
        order.push("second");
        // Should see data merged from step 1.
        expect(input.step1).toBe(true);
        return ok("second", tool, { step2: true });
      }),
    );

    const workflow: Workflow = {
      name: "wf",
      description: "two-step",
      steps: [
        { skillName: "first", toolName: "run", inputMapping: {} },
        { skillName: "second", toolName: "run", inputMapping: {} },
      ],
    };

    const result = await skillComposer.executeWorkflowInline(workflow, { seed: 1 });
    expect(result.success).toBe(true);
    expect(order).toEqual(["first", "second"]);
    expect(result.results).toHaveLength(2);
  });

  it("skips a step whose condition returns false", async () => {
    skillRegistry.register(
      makeSkill("a", async (tool) => {
        order.push("a");
        return ok("a", tool, { proceed: false });
      }),
    );
    const bExecute = jest.fn(async (tool: string) => {
      order.push("b");
      return ok("b", tool, {});
    });
    skillRegistry.register({
      name: "b",
      description: "b",
      version: "1.0.0",
      tools: [{ name: "run", description: "run", inputSchema: {} }],
      execute: bExecute,
    });

    const workflow: Workflow = {
      name: "cond",
      description: "conditional",
      steps: [
        { skillName: "a", toolName: "run", inputMapping: {} },
        {
          skillName: "b",
          toolName: "run",
          inputMapping: {},
          // Only run "b" if the previous result said proceed === true.
          condition: (prev) => prev[prev.length - 1]?.data.proceed === true,
        },
      ],
    };

    const result = await skillComposer.executeWorkflowInline(workflow, {});
    expect(result.success).toBe(true);
    expect(order).toEqual(["a"]); // b was skipped
    expect(bExecute).not.toHaveBeenCalled();
    expect(result.results).toHaveLength(1);
  });

  it("runs a conditional step when its condition is met", async () => {
    skillRegistry.register(makeSkill("a", async (t) => ok("a", t, { proceed: true })));
    skillRegistry.register(
      makeSkill("b", async (t) => {
        order.push("b");
        return ok("b", t, {});
      }),
    );

    const workflow: Workflow = {
      name: "cond2",
      description: "conditional met",
      steps: [
        { skillName: "a", toolName: "run", inputMapping: {} },
        {
          skillName: "b",
          toolName: "run",
          inputMapping: {},
          condition: (prev) => prev[prev.length - 1]?.data.proceed === true,
        },
      ],
    };

    const result = await skillComposer.executeWorkflowInline(workflow, {});
    expect(result.success).toBe(true);
    expect(order).toEqual(["b"]);
  });

  it("short-circuits and fails when a step returns success:false", async () => {
    skillRegistry.register(makeSkill("a", async (t) => ok("a", t, {})));
    skillRegistry.register({
      name: "bad",
      description: "bad",
      version: "1.0.0",
      tools: [{ name: "run", description: "run", inputSchema: {} }],
      execute: async (toolName) => ({
        success: false,
        data: {},
        error: "boom",
        executionTimeMs: 1,
        skillName: "bad",
        toolName,
      }),
    });
    const after = jest.fn(async (t: string) => ok("after", t, {}));
    skillRegistry.register({
      name: "after",
      description: "after",
      version: "1.0.0",
      tools: [{ name: "run", description: "run", inputSchema: {} }],
      execute: after,
    });

    const workflow: Workflow = {
      name: "failwf",
      description: "failing",
      steps: [
        { skillName: "a", toolName: "run", inputMapping: {} },
        { skillName: "bad", toolName: "run", inputMapping: {} },
        { skillName: "after", toolName: "run", inputMapping: {} },
      ],
    };

    const result = await skillComposer.executeWorkflowInline(workflow, {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("boom");
    expect(after).not.toHaveBeenCalled(); // never reached the third step
  });

  it("fails when a referenced skill is not registered", async () => {
    const workflow: Workflow = {
      name: "missing",
      description: "missing skill",
      steps: [{ skillName: "ghost", toolName: "run", inputMapping: {} }],
    };
    const result = await skillComposer.executeWorkflowInline(workflow, {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("executeWorkflow returns an error for an unregistered workflow name", async () => {
    const result = await skillComposer.executeWorkflow("does-not-exist", {});
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });
});
