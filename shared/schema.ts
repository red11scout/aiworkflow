import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type {
  StrategicTheme,
  BusinessFunction,
  FrictionPoint,
  UseCase,
  BenefitQuantification,
  ReadinessModel,
  PriorityScore,
  WorkflowMap,
  ExecutiveSummary,
  ExecutiveDashboard,
  ScenarioAnalysis,
  MultiYearProjection,
  FrictionRecovery,
} from "./types";

// =========================================================================
// PROJECTS — One per client engagement
// =========================================================================

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerToken: varchar("owner_token").notNull(),
  name: text("name").notNull(),
  companyName: text("company_name").notNull(),
  industry: text("industry").default(""),
  description: text("description").default(""),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  rawImport: jsonb("raw_import"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_projects_owner_token").on(table.ownerToken),
]);

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// =========================================================================
// SCENARIOS — Multiple versions per project
// =========================================================================

export const scenarios = pgTable("scenarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: text("name").notNull(),
  versionType: varchar("version_type", { length: 20 }).default("base"),
  isActive: boolean("is_active").default(false),

  // Step data (JSONB columns)
  companyOverview: text("company_overview").default(""),
  strategicThemes: jsonb("strategic_themes").$type<StrategicTheme[]>(),
  businessFunctions: jsonb("business_functions").$type<BusinessFunction[]>(),
  frictionPoints: jsonb("friction_points").$type<FrictionPoint[]>(),
  useCases: jsonb("use_cases").$type<UseCase[]>(),
  benefits: jsonb("benefits").$type<BenefitQuantification[]>(),
  readiness: jsonb("readiness").$type<ReadinessModel[]>(),
  priorities: jsonb("priorities").$type<PriorityScore[]>(),
  workflowMaps: jsonb("workflow_maps").$type<WorkflowMap[]>(),

  // Summary data
  executiveSummary: jsonb("executive_summary").$type<ExecutiveSummary>(),
  executiveDashboard: jsonb("executive_dashboard").$type<ExecutiveDashboard>(),
  scenarioAnalysis: jsonb("scenario_analysis").$type<ScenarioAnalysis>(),
  multiYear: jsonb("multi_year").$type<MultiYearProjection>(),
  frictionRecovery: jsonb("friction_recovery").$type<FrictionRecovery[]>(),
  analysisSummary: text("analysis_summary").default(""),

  // Navigation state
  currentStep: integer("current_step").default(0),
  completedSteps: jsonb("completed_steps").$type<number[]>().default([]),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_scenarios_project_id").on(table.projectId),
]);

export const insertScenarioSchema = createInsertSchema(scenarios).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertScenario = z.infer<typeof insertScenarioSchema>;
export type Scenario = typeof scenarios.$inferSelect;

// =========================================================================
// SHARE LINKS — Public access to reports
// =========================================================================

export const shareLinks = pgTable("share_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  scenarioId: varchar("scenario_id").notNull(),
  shareCode: varchar("share_code", { length: 12 }).unique().notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_share_links_code").on(table.shareCode),
]);

export type ShareLink = typeof shareLinks.$inferSelect;

// =========================================================================
// AI CONVERSATIONS — Chat history with assistant
// =========================================================================

export const aiConversations = pgTable("ai_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  scenarioId: varchar("scenario_id").notNull(),
  section: varchar("section", { length: 30 }).notNull(),
  messages: jsonb("messages").$type<Array<{ role: string; content: string }>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
