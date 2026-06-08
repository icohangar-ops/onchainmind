/**
 * OnchainMind — Skill Registry
 *
 * Central registry for discovering, listing, and accessing all registered
 * OnchainMind skills. Skills self-register on import via the singleton instance.
 */

import type { Skill, ToolDefinition } from "../utils/types";
import { createLogger } from "../utils/logger";

const logger = createLogger("info", "SkillRegistry");

class SkillRegistrySingleton {
  private skills: Map<string, Skill>;
  private toolIndex: Map<string, { skillName: string; tool: ToolDefinition }>;

  constructor() {
    this.skills = new Map();
    this.toolIndex = new Map();
  }

  /** Register a skill instance */
  register(skill: Skill): void {
    if (this.skills.has(skill.name)) {
      logger.warn(`Skill "${skill.name}" is already registered. Skipping duplicate.`);
      return;
    }

    this.skills.set(skill.name, skill);

    for (const tool of skill.tools) {
      const qualifiedName = `${skill.name}.${tool.name}`;
      this.toolIndex.set(qualifiedName, { skillName: skill.name, tool });
      logger.info(`Registered tool: ${qualifiedName}`);
    }

    logger.info(`Registered skill: ${skill.name} (v${skill.version}) — ${skill.tools.length} tools`);
  }

  /** Register multiple skills at once */
  registerAll(skills: Skill[]): void {
    for (const skill of skills) {
      this.register(skill);
    }
  }

  /** Get a skill by name */
  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /** Get all registered skills */
  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  /** Get all registered tools across all skills */
  getAllTools(): Array<{ skillName: string; tool: ToolDefinition }> {
    return Array.from(this.toolIndex.values());
  }

  /** Find which skill owns a given tool name */
  findToolOwner(toolName: string): { skill: Skill; tool: ToolDefinition } | undefined {
    for (const skill of this.skills.values()) {
      const tool = skill.tools.find((t) => t.name === toolName);
      if (tool) {
        return { skill, tool };
      }
    }
    return undefined;
  }

  /** Check if a skill is registered */
  has(name: string): boolean {
    return this.skills.has(name);
  }

  /** List all skill names */
  listNames(): string[] {
    return Array.from(this.skills.keys());
  }

  /** Get a summary of all registered skills and their tools */
  getSummary(): Array<{
    name: string;
    description: string;
    version: string;
    toolCount: number;
    toolNames: string[];
  }> {
    return Array.from(this.skills.values()).map((skill) => ({
      name: skill.name,
      description: skill.description,
      version: skill.version,
      toolCount: skill.tools.length,
      toolNames: skill.tools.map((t) => t.name),
    }));
  }

  /** Get total count of skills and tools */
  getStats(): { skillCount: number; toolCount: number } {
    return {
      skillCount: this.skills.size,
      toolCount: this.toolIndex.size,
    };
  }
}

/** Global skill registry singleton */
export const skillRegistry = new SkillRegistrySingleton();
