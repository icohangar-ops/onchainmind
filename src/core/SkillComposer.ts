/**
 * OnchainMind — Skill Composer
 *
 * Chains multiple skills into executable workflows.
 * Enables agents to create complex on-chain intelligence pipelines
 * by composing simpler, reusable skills.
 *
 * Example workflow: Sentiment → TokenAnalysis → DefiStrategy
 * Creates a "sentiment-aware yield hunting" pipeline.
 */

import type { SkillResult, Workflow, WorkflowResult } from "../utils/types";
import { skillRegistry } from "./SkillRegistry";
import { createLogger } from "../utils/logger";

const logger = createLogger("info", "SkillComposer");

class SkillComposerSingleton {
  private workflows: Map<string, Workflow>;

  constructor() {
    this.workflows = new Map();
  }

  /**
   * Register a named workflow for later execution
   */
  registerWorkflow(workflow: Workflow): void {
    if (this.workflows.has(workflow.name)) {
      logger.warn(`Workflow "${workflow.name}" already registered. Overwriting.`);
    }
    this.workflows.set(workflow.name, workflow);
    logger.info(`Registered workflow: ${workflow.name} (${workflow.steps.length} steps)`);
  }

  /**
   * Execute a registered workflow by name
   */
  async executeWorkflow(workflowName: string, initialInput: Record<string, unknown>): Promise<WorkflowResult> {
    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      return {
        success: false,
        results: [],
        totalExecutionTimeMs: 0,
        error: `Workflow "${workflowName}" not found. Available: ${Array.from(this.workflows.keys()).join(", ")}`,
      };
    }

    return this.executeWorkflowInline(workflow, initialInput);
  }

  /**
   * Execute a workflow directly (ad-hoc composition)
   */
  async executeWorkflowInline(workflow: Workflow, initialInput: Record<string, unknown>): Promise<WorkflowResult> {
    const startTime = Date.now();
    const results: SkillResult[] = [];
    let currentInput = { ...initialInput };

    logger.info(`Executing workflow: ${workflow.name}`);

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];

      // Check conditional execution
      if (step.condition && !step.condition(results)) {
        logger.info(`Skipping step ${i + 1} (${step.skillName}.${step.toolName}) — condition not met`);
        continue;
      }

      // Map previous results into current step input
      const stepInput = this.mapInput(currentInput, results, step.inputMapping);

      // Get the skill and execute
      const skill = skillRegistry.get(step.skillName);
      if (!skill) {
        return {
          success: false,
          results,
          totalExecutionTimeMs: Date.now() - startTime,
          error: `Skill "${step.skillName}" not found in registry`,
        };
      }

      try {
        const result = await skill.execute(step.toolName, stepInput);
        results.push(result);

        if (!result.success) {
          logger.warn(`Step ${i + 1} failed: ${result.error}`);
          return {
            success: false,
            results,
            totalExecutionTimeMs: Date.now() - startTime,
            error: `Workflow failed at step ${i + 1} (${step.skillName}.${step.toolName}): ${result.error}`,
          };
        }

        // Pass result data forward
        currentInput = { ...currentInput, ...result.data };
        logger.info(`Step ${i + 1}/${workflow.steps.length} completed in ${result.executionTimeMs}ms`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          results,
          totalExecutionTimeMs: Date.now() - startTime,
          error: `Step ${i + 1} threw error: ${errorMessage}`,
        };
      }
    }

    const totalTime = Date.now() - startTime;
    logger.info(`Workflow "${workflow.name}" completed in ${totalTime}ms`);

    return {
      success: true,
      results,
      totalExecutionTimeMs: totalTime,
    };
  }

  /**
   * Chain skills together dynamically — creates a workflow from skill/tool pairs.
   * Output from step N is automatically fed as input to step N+1.
   */
  chain(steps: Array<{ skillName: string; toolName: string }>): Workflow {
    const stepDefinitions = steps.map((s, i) => ({
      skillName: s.skillName,
      toolName: s.toolName,
      inputMapping: this.buildPassThroughMapping(i, steps.length),
    }));

    return {
      name: `chained-${steps.map((s) => `${s.skillName}.${s.toolName}`).join("→")}`,
      description: `Chained workflow: ${steps.map((s) => `${s.skillName}.${s.toolName}`).join(" → ")}`,
      steps: stepDefinitions,
    };
  }

  /**
   * List all registered workflows
   */
  listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get all registered workflow names
   */
  listWorkflowNames(): string[] {
    return Array.from(this.workflows.keys());
  }

  /** Map input data from previous results and explicit inputs */
  private mapInput(
    currentInput: Record<string, unknown>,
    prevResults: SkillResult[],
    mapping: Record<string, string>
  ): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};

    // Start with current input as base
    for (const [key, value] of Object.entries(currentInput)) {
      mapped[key] = value;
    }

    // Apply mapping overrides
    for (const [targetKey, sourceExpr] of Object.entries(mapping)) {
      if (sourceExpr.startsWith("$prev.") && prevResults.length > 0) {
        const lastResult = prevResults[prevResults.length - 1];
        const fieldPath = sourceExpr.replace("$prev.", "");
        mapped[targetKey] = this.getNestedValue(lastResult.data, fieldPath);
      } else if (sourceExpr.startsWith("$input.")) {
        const fieldPath = sourceExpr.replace("$input.", "");
        mapped[targetKey] = this.getNestedValue(currentInput, fieldPath);
      } else {
        mapped[targetKey] = sourceExpr;
      }
    }

    return mapped;
  }

  /** Build auto-mapping that passes all previous data forward */
  private buildPassThroughMapping(stepIndex: number, _totalSteps: number): Record<string, string> {
    if (stepIndex === 0) {
      return {};
    }
    // Auto pass-through for chained execution
    return { "__auto_passthrough": "$prev" };
  }

  /** Get a nested value from an object using dot notation */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split(".");
    let current: unknown = obj;
    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== "object") {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }
}

/** Global skill composer singleton */
export const skillComposer = new SkillComposerSingleton();
