import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import {
  projects,
  scenarios,
  shareLinks,
  aiConversations,
  type InsertProject,
  type InsertScenario,
  type Project,
  type Scenario,
  type ShareLink,
} from "@shared/schema";

export interface IStorage {
  // Projects
  createProject(data: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByOwner(ownerToken: string): Promise<Project[]>;
  updateProject(id: string, data: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;

  // Scenarios
  createScenario(data: InsertScenario): Promise<Scenario>;
  getScenario(id: string): Promise<Scenario | undefined>;
  getScenariosByProject(projectId: string): Promise<Scenario[]>;
  getActiveScenario(projectId: string): Promise<Scenario | undefined>;
  updateScenario(id: string, data: Partial<Scenario>): Promise<Scenario | undefined>;
  setActiveScenario(projectId: string, scenarioId: string): Promise<void>;
  deleteScenario(id: string): Promise<void>;

  // Share links
  createShareLink(projectId: string, scenarioId: string, code: string): Promise<ShareLink>;
  getShareLink(code: string): Promise<ShareLink | undefined>;

  // AI conversations
  saveConversation(
    projectId: string,
    scenarioId: string,
    section: string,
    messages: Array<{ role: string; content: string }>,
  ): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Projects
  async createProject(data: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async getProjectsByOwner(ownerToken: string): Promise<Project[]> {
    return db
      .select()
      .from(projects)
      .where(eq(projects.ownerToken, ownerToken))
      .orderBy(desc(projects.updatedAt));
  }

  async updateProject(
    id: string,
    data: Partial<Project>,
  ): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(scenarios).where(eq(scenarios.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Scenarios
  async createScenario(data: InsertScenario): Promise<Scenario> {
    const [scenario] = await db.insert(scenarios).values(data).returning();
    return scenario;
  }

  async getScenario(id: string): Promise<Scenario | undefined> {
    const [scenario] = await db
      .select()
      .from(scenarios)
      .where(eq(scenarios.id, id));
    return scenario;
  }

  async getScenariosByProject(projectId: string): Promise<Scenario[]> {
    return db
      .select()
      .from(scenarios)
      .where(eq(scenarios.projectId, projectId))
      .orderBy(desc(scenarios.createdAt));
  }

  async getActiveScenario(projectId: string): Promise<Scenario | undefined> {
    const [scenario] = await db
      .select()
      .from(scenarios)
      .where(
        and(eq(scenarios.projectId, projectId), eq(scenarios.isActive, true)),
      );
    return scenario;
  }

  async updateScenario(
    id: string,
    data: Partial<Scenario>,
  ): Promise<Scenario | undefined> {
    const [scenario] = await db
      .update(scenarios)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scenarios.id, id))
      .returning();
    return scenario;
  }

  async setActiveScenario(
    projectId: string,
    scenarioId: string,
  ): Promise<void> {
    // Deactivate all scenarios for this project
    await db
      .update(scenarios)
      .set({ isActive: false })
      .where(eq(scenarios.projectId, projectId));

    // Activate the selected one
    await db
      .update(scenarios)
      .set({ isActive: true })
      .where(eq(scenarios.id, scenarioId));
  }

  async deleteScenario(id: string): Promise<void> {
    await db.delete(scenarios).where(eq(scenarios.id, id));
  }

  // Share links
  async createShareLink(
    projectId: string,
    scenarioId: string,
    code: string,
  ): Promise<ShareLink> {
    const [link] = await db
      .insert(shareLinks)
      .values({ projectId, scenarioId, shareCode: code })
      .returning();
    return link;
  }

  async getShareLink(code: string): Promise<ShareLink | undefined> {
    const [link] = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.shareCode, code));
    return link;
  }

  // AI conversations
  async saveConversation(
    projectId: string,
    scenarioId: string,
    section: string,
    messages: Array<{ role: string; content: string }>,
  ): Promise<void> {
    await db
      .insert(aiConversations)
      .values({ projectId, scenarioId, section, messages });
  }
}

export const storage = new DatabaseStorage();
