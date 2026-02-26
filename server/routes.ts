import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { parseImportedJSON } from "./json-parser";
import {
  recalculateBenefits,
  recalculateReadiness,
  recalculatePriorities,
  generateScenarioAnalysis,
  generateMultiYearProjection,
  generateExecutiveDashboard,
} from "./calculation-engine";
import { SCENARIO_MULTIPLIERS } from "@shared/formulas";
import { nanoid } from "nanoid";
import type { WorkflowMap } from "@shared/types";

export async function registerRoutes(server: Server, app: Express) {
  // =====================================================================
  // PROJECTS
  // =====================================================================

  app.get("/api/projects", async (req, res) => {
    const ownerToken = req.headers["x-owner-token"] as string;
    if (!ownerToken) return res.status(400).json({ message: "Missing owner token" });
    const projects = await storage.getProjectsByOwner(ownerToken);
    res.json(projects);
  });

  app.post("/api/projects", async (req, res) => {
    const { name, companyName, industry, description, rawImport } = req.body;
    const ownerToken = req.body.ownerToken || (req.headers["x-owner-token"] as string);
    if (!ownerToken || !name || !companyName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const project = await storage.createProject({
      ownerToken,
      name,
      companyName,
      industry: industry || "",
      description: description || "",
      rawImport: rawImport || null,
    });

    // If rawImport provided, parse and create base scenario
    if (rawImport) {
      try {
        const parsed = parseImportedJSON(rawImport);
        await storage.createScenario({
          projectId: project.id,
          name: "Base Case",
          versionType: "base",
          isActive: true,
          companyOverview: parsed.companyOverview,
          strategicThemes: parsed.strategicThemes,
          businessFunctions: parsed.businessFunctions,
          frictionPoints: parsed.frictionPoints,
          useCases: parsed.useCases,
          benefits: parsed.benefits,
          readiness: parsed.readiness,
          priorities: parsed.priorities,
          executiveSummary: parsed.executiveSummary,
          executiveDashboard: parsed.executiveDashboard,
          scenarioAnalysis: parsed.scenarioAnalysis,
          multiYear: parsed.multiYear,
          frictionRecovery: parsed.frictionRecovery,
          analysisSummary: parsed.analysisSummary,
          currentStep: 0,
          completedSteps: [],
        });
      } catch (err: any) {
        console.error("Error parsing import:", err.message);
      }
    }

    res.json(project);
  });

  app.get("/api/projects/:id", async (req, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const activeScenario = await storage.getActiveScenario(project.id);
    const allScenarios = await storage.getScenariosByProject(project.id);

    res.json({ ...project, activeScenario, scenarios: allScenarios });
  });

  app.put("/api/projects/:id", async (req, res) => {
    const project = await storage.updateProject(req.params.id, req.body);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.delete("/api/projects/:id", async (req, res) => {
    await storage.deleteProject(req.params.id);
    res.json({ success: true });
  });

  // Import JSON data into an existing project
  app.post("/api/projects/:id/import", async (req, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const { rawJson } = req.body;
    if (!rawJson) return res.status(400).json({ message: "Missing rawJson" });

    try {
      // Update project with raw import
      await storage.updateProject(project.id, {
        rawImport: rawJson,
        companyName: rawJson.companyName || project.companyName,
        industry: rawJson.industry || project.industry,
        status: "in_progress",
      });

      // Parse and create/update base scenario
      const parsed = parseImportedJSON(rawJson);

      // Check if base scenario exists
      const existing = await storage.getActiveScenario(project.id);
      if (existing) {
        await storage.updateScenario(existing.id, {
          companyOverview: parsed.companyOverview,
          strategicThemes: parsed.strategicThemes,
          businessFunctions: parsed.businessFunctions,
          frictionPoints: parsed.frictionPoints,
          useCases: parsed.useCases,
          benefits: parsed.benefits,
          readiness: parsed.readiness,
          priorities: parsed.priorities,
          executiveSummary: parsed.executiveSummary,
          executiveDashboard: parsed.executiveDashboard,
          scenarioAnalysis: parsed.scenarioAnalysis,
          multiYear: parsed.multiYear,
          frictionRecovery: parsed.frictionRecovery,
          analysisSummary: parsed.analysisSummary,
          completedSteps: [0],
        });
      } else {
        await storage.createScenario({
          projectId: project.id,
          name: "Base Case",
          versionType: "base",
          isActive: true,
          companyOverview: parsed.companyOverview,
          strategicThemes: parsed.strategicThemes,
          businessFunctions: parsed.businessFunctions,
          frictionPoints: parsed.frictionPoints,
          useCases: parsed.useCases,
          benefits: parsed.benefits,
          readiness: parsed.readiness,
          priorities: parsed.priorities,
          executiveSummary: parsed.executiveSummary,
          executiveDashboard: parsed.executiveDashboard,
          scenarioAnalysis: parsed.scenarioAnalysis,
          multiYear: parsed.multiYear,
          frictionRecovery: parsed.frictionRecovery,
          analysisSummary: parsed.analysisSummary,
          currentStep: 0,
          completedSteps: [0],
        });
      }

      res.json({
        success: true,
        summary: {
          themes: parsed.strategicThemes.length,
          functions: parsed.businessFunctions.length,
          frictionPoints: parsed.frictionPoints.length,
          useCases: parsed.useCases.length,
          benefits: parsed.benefits.length,
        },
        companyName: rawJson.companyName,
        industry: rawJson.industry || "",
        companyOverview: parsed.companyOverview,
        validationWarnings: parsed.validationWarnings || [],
      });
    } catch (err: any) {
      console.error("Error parsing import:", err.message);
      res.status(400).json({ message: `Import failed: ${err.message}` });
    }
  });

  // =====================================================================
  // SCENARIOS
  // =====================================================================

  app.get("/api/projects/:id/scenarios", async (req, res) => {
    const scenarios = await storage.getScenariosByProject(req.params.id);
    res.json(scenarios);
  });

  app.post("/api/projects/:id/scenarios", async (req, res) => {
    const { name, versionType, duplicateFrom } = req.body;

    let scenarioData: any = {
      projectId: req.params.id,
      name: name || "New Scenario",
      versionType: versionType || "custom",
      isActive: false,
    };

    // If duplicating, copy data from source scenario
    if (duplicateFrom) {
      const source = await storage.getScenario(duplicateFrom);
      if (source) {
        scenarioData = {
          ...scenarioData,
          companyOverview: source.companyOverview,
          strategicThemes: source.strategicThemes,
          businessFunctions: source.businessFunctions,
          frictionPoints: source.frictionPoints,
          useCases: source.useCases,
          benefits: source.benefits,
          readiness: source.readiness,
          priorities: source.priorities,
          workflowMaps: source.workflowMaps,
          executiveSummary: source.executiveSummary,
          executiveDashboard: source.executiveDashboard,
          scenarioAnalysis: source.scenarioAnalysis,
          multiYear: source.multiYear,
          frictionRecovery: source.frictionRecovery,
          analysisSummary: source.analysisSummary,
          currentStep: source.currentStep,
          completedSteps: source.completedSteps,
        };
      }
    }

    // Apply scenario multipliers for conservative/optimistic
    if (versionType === "conservative" || versionType === "optimistic") {
      if (scenarioData.benefits) {
        const multiplier = SCENARIO_MULTIPLIERS[versionType];
        scenarioData.benefits = recalculateBenefits(
          scenarioData.benefits,
          multiplier,
        );
      }
    }

    const scenario = await storage.createScenario(scenarioData);
    res.json(scenario);
  });

  app.get("/api/scenarios/:id", async (req, res) => {
    const scenario = await storage.getScenario(req.params.id);
    if (!scenario)
      return res.status(404).json({ message: "Scenario not found" });
    res.json(scenario);
  });

  app.put("/api/scenarios/:id", async (req, res) => {
    const scenario = await storage.updateScenario(req.params.id, req.body);
    if (!scenario)
      return res.status(404).json({ message: "Scenario not found" });
    res.json(scenario);
  });

  // Update a specific section of a scenario
  app.put("/api/scenarios/:id/section/:step", async (req, res) => {
    const { data } = req.body;

    // Support both step numbers and section name strings
    const nameMap: Record<string, string> = {
      company_overview: "companyOverview",
      strategic_themes: "strategicThemes",
      business_functions: "businessFunctions",
      friction_points: "frictionPoints",
      use_cases: "useCases",
      benefits: "benefits",
      readiness: "readiness",
      priorities: "priorities",
      workflow_maps: "workflowMaps",
      executive_summary: "executiveSummary",
    };

    const stepNumMap: Record<number, string> = {
      0: "companyOverview",
      1: "strategicThemes",
      2: "businessFunctions",
      3: "frictionPoints",
      4: "useCases",
      5: "benefits",
      6: "readiness",
      7: "priorities",
    };

    const stepParam = req.params.step;
    const stepNum = parseInt(stepParam);
    const field = isNaN(stepNum) ? nameMap[stepParam] : stepNumMap[stepNum];

    if (!field)
      return res.status(400).json({ message: "Invalid step identifier" });

    const scenario = await storage.updateScenario(req.params.id, {
      [field]: data,
    } as any);
    if (!scenario)
      return res.status(404).json({ message: "Scenario not found" });
    res.json(scenario);
  });

  app.post("/api/scenarios/:id/activate", async (req, res) => {
    const scenario = await storage.getScenario(req.params.id);
    if (!scenario)
      return res.status(404).json({ message: "Scenario not found" });
    await storage.setActiveScenario(scenario.projectId, scenario.id);
    res.json({ success: true });
  });

  app.delete("/api/scenarios/:id", async (req, res) => {
    await storage.deleteScenario(req.params.id);
    res.json({ success: true });
  });

  // =====================================================================
  // CALCULATIONS
  // =====================================================================

  app.post("/api/calculate/benefits", async (req, res) => {
    const { benefits, scenarioType } = req.body;
    const multiplier =
      SCENARIO_MULTIPLIERS[scenarioType] || SCENARIO_MULTIPLIERS.base;
    const result = recalculateBenefits(benefits, multiplier);
    res.json(result);
  });

  app.post("/api/calculate/readiness", async (req, res) => {
    const { readiness } = req.body;
    const result = recalculateReadiness(readiness);
    res.json(result);
  });

  app.post("/api/calculate/priorities", async (req, res) => {
    const { benefits, readiness, frictionPoints, useCases } = req.body;
    const result = recalculatePriorities(benefits, readiness, frictionPoints, useCases);
    res.json(result);
  });

  app.post("/api/calculate/scenarios", async (req, res) => {
    const { benefits } = req.body;
    const result = generateScenarioAnalysis(benefits);
    res.json(result);
  });

  app.post("/api/calculate/multi-year", async (req, res) => {
    const { benefits } = req.body;
    const result = generateMultiYearProjection(benefits);
    res.json(result);
  });

  app.post("/api/calculate/dashboard", async (req, res) => {
    const { benefits, readiness, priorities } = req.body;
    const result = generateExecutiveDashboard(benefits, readiness, priorities);
    res.json(result);
  });

  // Full recalculation: update all downstream data for a scenario
  app.post("/api/scenarios/:id/recalculate", async (req, res) => {
    const scenario = await storage.getScenario(req.params.id);
    if (!scenario)
      return res.status(404).json({ message: "Scenario not found" });

    const benefits = scenario.benefits || [];
    const readinessData = scenario.readiness || [];
    const frictionData = (scenario.frictionPoints || []) as any[];
    const useCaseData = (scenario.useCases || []) as any[];

    const updatedReadiness = recalculateReadiness(readinessData);
    const updatedBenefits = recalculateBenefits(benefits);
    const updatedPriorities = recalculatePriorities(
      updatedBenefits,
      updatedReadiness,
      frictionData,
      useCaseData,
    );
    const updatedScenarios = generateScenarioAnalysis(updatedBenefits);
    const updatedMultiYear = generateMultiYearProjection(updatedBenefits);
    const updatedDashboard = generateExecutiveDashboard(
      updatedBenefits,
      updatedReadiness,
      updatedPriorities,
    );

    const updated = await storage.updateScenario(scenario.id, {
      benefits: updatedBenefits,
      readiness: updatedReadiness,
      priorities: updatedPriorities,
      scenarioAnalysis: updatedScenarios,
      multiYear: updatedMultiYear,
      executiveDashboard: updatedDashboard,
    } as any);

    res.json(updated);
  });

  // =====================================================================
  // SCENARIO COMPARISON
  // =====================================================================

  app.get("/api/projects/:id/compare", async (req, res) => {
    const { s1, s2 } = req.query;
    if (!s1 || !s2)
      return res.status(400).json({ message: "Provide s1 and s2 scenario IDs" });

    const [scenario1, scenario2] = await Promise.all([
      storage.getScenario(s1 as string),
      storage.getScenario(s2 as string),
    ]);

    if (!scenario1 || !scenario2)
      return res.status(404).json({ message: "Scenario not found" });

    res.json({ scenario1, scenario2 });
  });

  // =====================================================================
  // AI ASSISTANT
  // =====================================================================

  app.post("/api/ai/assist", async (req, res) => {
    const { section, context, userPrompt } = req.body;

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        message: "AI assistant not configured. Set ANTHROPIC_API_KEY.",
      });
    }

    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });

      const systemPrompt = getAssistantSystemPrompt(section);

      const stream = await client.messages.stream({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Context:\n${JSON.stringify(context, null, 2)}\n\nUser request: ${userPrompt}`,
          },
        ],
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err: any) {
      console.error("AI assist error:", err.message);
      res.status(500).json({ message: "AI assistant error" });
    }
  });

  // AI workflow generation — batch generates workflows for ALL use cases in a scenario
  app.post("/api/ai/generate-workflow", async (req, res) => {
    const { scenarioId } = req.body;

    if (!scenarioId) {
      return res.status(400).json({ message: "Missing scenarioId" });
    }

    const scenario = await storage.getScenario(scenarioId);
    if (!scenario) {
      return res.status(404).json({ message: "Scenario not found" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        message: "AI assistant not configured. Set ANTHROPIC_API_KEY.",
      });
    }

    const useCases = (scenario.useCases as any[]) || [];
    const frictionPoints = (scenario.frictionPoints as any[]) || [];

    if (useCases.length === 0) {
      return res.status(400).json({ message: "No use cases in scenario" });
    }

    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });

      const workflowMaps: WorkflowMap[] = [];

      for (const uc of useCases) {
        const matchedFP = frictionPoints.find(
          (fp: any) => fp.frictionPoint === uc.targetFriction,
        );

        const response = await client.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 4096,
          system: `You are an expert AI workflow architect specializing in enterprise process transformation. Generate detailed workflow visualizations comparing current manual processes with AI-powered alternatives.

CRITICAL REQUIREMENTS:
1. Current State: Generate 5-8 detailed steps showing the manual/legacy process with realistic durations
2. Target State: Generate 5-8 steps showing the AI-enhanced process
3. EVERY target workflow MUST have at least ONE Human-in-the-Loop checkpoint
4. Current state MUST identify bottlenecks (mark at least 1-2 steps as isBottleneck: true) and pain points
5. All durations must be realistic estimates grounded in the specific business function
6. Comparison metrics must show meaningful, realistic improvements
7. Return ONLY valid JSON — no markdown, no code blocks, no explanatory text`,
          messages: [
            {
              role: "user",
              content: `Generate a detailed workflow comparison for this AI use case:

USE CASE: ${uc.name}
DESCRIPTION: ${uc.description || "N/A"}
BUSINESS FUNCTION: ${uc.function || "N/A"} / ${uc.subFunction || "N/A"}
TARGET FRICTION: ${uc.targetFriction || "N/A"}
FRICTION TYPE: ${matchedFP?.frictionType || "N/A"}
FRICTION ANNUAL COST: ${matchedFP?.estimatedAnnualCost || "N/A"}
FRICTION ANNUAL HOURS: ${matchedFP?.annualHours || "N/A"}
STRATEGIC THEME: ${uc.strategicTheme || "N/A"}
AI PRIMITIVES: ${(uc.aiPrimitives || []).join(", ")}
AGENTIC PATTERN: ${uc.agenticPattern || "Not specified"}
PATTERN RATIONALE: ${uc.patternRationale || "Not specified"}
DESIRED OUTCOMES: ${(uc.desiredOutcomes || []).join("; ") || "N/A"}
DATA TYPES: ${(uc.dataTypes || []).join(", ") || "N/A"}
INTEGRATIONS: ${(uc.integrations || []).join(", ") || "N/A"}

Return JSON with this EXACT structure:
{
  "currentState": [
    {"id": "cs-1", "stepNumber": 1, "name": "Step name", "description": "Detailed description of what happens", "actorType": "human", "actorName": "Role title", "duration": "2 hours", "systems": ["System name"], "isBottleneck": true, "isDecisionPoint": false, "painPoints": ["Pain point description"]}
  ],
  "targetState": [
    {"id": "ts-1", "stepNumber": 1, "name": "Step name", "description": "Detailed description of what happens", "actorType": "ai_agent", "actorName": "AI Agent name", "duration": "5 minutes", "systems": ["System name"], "isBottleneck": false, "isDecisionPoint": false, "painPoints": [], "isAIEnabled": true, "isHumanInTheLoop": false, "aiCapabilities": ["NLP", "Pattern Recognition"], "automationLevel": "full"}
  ],
  "comparisonMetrics": {
    "timeReduction": {"before": "45 days", "after": "7 days", "improvement": "84%"},
    "costReduction": {"before": "$9.8M/yr", "after": "$3.3M/yr", "improvement": "66%"},
    "qualityImprovement": {"before": "72% accuracy", "after": "94% accuracy", "improvement": "+22%"},
    "throughputIncrease": {"before": "100/month", "after": "500/month", "improvement": "5x"}
  }
}

IMPORTANT: Ground the metrics in the friction point data provided. The cost reduction "before" should align with the friction annual cost. The time reduction should reflect the friction annual hours. Make improvements realistic and achievable.`,
            },
          ],
        });

        const text =
          response.content[0].type === "text" ? response.content[0].text : "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          try {
            const workflow = JSON.parse(jsonMatch[0]);
            workflowMaps.push({
              useCaseId: uc.id,
              useCaseName: uc.name,
              agenticPattern: uc.agenticPattern || "",
              patternRationale: uc.patternRationale || "",
              currentState: workflow.currentState || [],
              targetState: workflow.targetState || [],
              comparisonMetrics: workflow.comparisonMetrics || {
                timeReduction: { before: "--", after: "--", improvement: "--" },
                costReduction: { before: "--", after: "--", improvement: "--" },
                qualityImprovement: { before: "--", after: "--", improvement: "--" },
                throughputIncrease: { before: "--", after: "--", improvement: "--" },
              },
              desiredOutcomes: uc.desiredOutcomes || [],
              dataTypes: uc.dataTypes || [],
              integrations: uc.integrations || [],
            });
          } catch (parseErr) {
            console.error(`Failed to parse workflow for ${uc.id}:`, parseErr);
            // Still add an empty workflow entry so the use case shows up
            workflowMaps.push({
              useCaseId: uc.id,
              useCaseName: uc.name,
              agenticPattern: uc.agenticPattern || "",
              patternRationale: uc.patternRationale || "",
              currentState: [],
              targetState: [],
              comparisonMetrics: {
                timeReduction: { before: "--", after: "--", improvement: "--" },
                costReduction: { before: "--", after: "--", improvement: "--" },
                qualityImprovement: { before: "--", after: "--", improvement: "--" },
                throughputIncrease: { before: "--", after: "--", improvement: "--" },
              },
              desiredOutcomes: uc.desiredOutcomes || [],
              dataTypes: uc.dataTypes || [],
              integrations: uc.integrations || [],
            });
          }
        }

        // Rate limit: 500ms between API calls to avoid rate limits
        if (useCases.indexOf(uc) < useCases.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      // Save workflow maps to the scenario
      await storage.updateScenario(scenarioId, {
        workflowMaps,
      } as any);

      res.json({ success: true, count: workflowMaps.length, workflowMaps });
    } catch (err: any) {
      console.error("Workflow generation error:", err.message);
      res.status(500).json({ message: "Workflow generation error" });
    }
  });

  // =====================================================================
  // EXPORT & SHARING
  // =====================================================================

  app.post("/api/projects/:id/share", async (req, res) => {
    const { scenarioId } = req.body;
    const project = await storage.getProject(req.params.id);
    if (!project)
      return res.status(404).json({ message: "Project not found" });

    const code = nanoid(10);
    const link = await storage.createShareLink(
      project.id,
      scenarioId || "",
      code,
    );
    res.json({ shareCode: code, link });
  });

  app.get("/api/shared/:code", async (req, res) => {
    const link = await storage.getShareLink(req.params.code);
    if (!link)
      return res.status(404).json({ message: "Share link not found" });

    const project = await storage.getProject(link.projectId);
    const scenario = link.scenarioId
      ? await storage.getScenario(link.scenarioId)
      : await storage.getActiveScenario(link.projectId);

    if (!project || !scenario)
      return res.status(404).json({ message: "Data not found" });

    // Flatten scenario data into a single report object for the SharedReport page
    res.json({
      companyName: project.companyName,
      industry: project.industry,
      generatedAt: scenario.updatedAt || scenario.createdAt,
      strategicThemes: scenario.strategicThemes || [],
      businessFunctions: scenario.businessFunctions || [],
      frictionMapping: scenario.frictionPoints || [],
      useCases: scenario.useCases || [],
      benefits: scenario.benefits || [],
      readiness: scenario.readiness || [],
      priorities: scenario.priorities || [],
      workflowMaps: scenario.workflowMaps || [],
      dashboard: scenario.executiveDashboard || null,
      scenarioAnalysis: scenario.scenarioAnalysis || null,
      multiYear: scenario.multiYear || null,
      frictionRecovery: scenario.frictionRecovery || null,
      executiveSummary: (scenario.executiveDashboard as any)?.executiveSummary || scenario.executiveSummary || null,
    });
  });

  // HTML report generation
  app.post("/api/projects/:id/export/html", async (req, res) => {
    const { scenarioId } = req.body;
    const project = await storage.getProject(req.params.id);
    if (!project)
      return res.status(404).json({ message: "Project not found" });

    const scenario = scenarioId
      ? await storage.getScenario(scenarioId)
      : await storage.getActiveScenario(project.id);

    if (!scenario)
      return res.status(404).json({ message: "Scenario not found" });

    const { generateHTMLReport } = await import("./export-service");
    const html = generateHTMLReport(project, scenario);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });

  // Excel export
  app.post("/api/projects/:id/export/excel", async (req, res) => {
    const { scenarioId } = req.body;
    const project = await storage.getProject(req.params.id);
    if (!project)
      return res.status(404).json({ message: "Project not found" });

    const scenario = scenarioId
      ? await storage.getScenario(scenarioId)
      : await storage.getActiveScenario(project.id);

    if (!scenario)
      return res.status(404).json({ message: "Scenario not found" });

    const { generateExcelReport } = await import("./export-service");
    const buffer = await generateExcelReport(project, scenario);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${project.companyName.replace(/[^a-zA-Z0-9]/g, "_")}_AI_Workflow.xlsx"`,
    );
    res.send(buffer);
  });

  // JSON export — reconstructs the discover-compatible format from scenario data
  app.post("/api/projects/:id/export/json", async (req, res) => {
    const { scenarioId } = req.body;
    const project = await storage.getProject(req.params.id);
    if (!project)
      return res.status(404).json({ message: "Project not found" });

    const scenario = scenarioId
      ? await storage.getScenario(scenarioId)
      : await storage.getActiveScenario(project.id);

    if (!scenario)
      return res.status(404).json({ message: "Scenario not found" });

    const exportData = {
      exportVersion: "2.0",
      exportedAt: new Date().toISOString(),
      source: "BlueAlly AI Workflow Orchestration",
      company: {
        name: project.companyName,
        industry: project.industry,
        description: project.description || "",
      },
      analysis: {
        steps: [
          { step: 0, name: "Company Overview", content: (scenario as any).companyOverview || "" },
          { step: 1, name: "Strategic Themes", data: scenario.strategicThemes || [] },
          { step: 2, name: "Business Functions & KPIs", data: scenario.businessFunctions || [] },
          { step: 3, name: "Friction Points", data: scenario.frictionPoints || [] },
          { step: 4, name: "AI Use Cases", data: scenario.useCases || [] },
          { step: 5, name: "Benefits Quantification", data: scenario.benefits || [] },
          { step: 6, name: "Readiness & Token Modeling", data: scenario.readiness || [] },
          { step: 7, name: "Priority Scoring", data: scenario.priorities || [] },
        ],
        executiveSummary: scenario.executiveSummary || null,
        executiveDashboard: scenario.executiveDashboard || null,
        scenarioAnalysis: scenario.scenarioAnalysis || null,
        workflowMaps: scenario.workflowMaps || [],
      },
      scenario: {
        id: scenario.id,
        name: scenario.name,
        completedSteps: scenario.completedSteps || [],
      },
    };

    const filename = `${project.companyName.replace(/[^a-zA-Z0-9]/g, "_")}_AI_Workflow_Export.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(exportData, null, 2));
  });
}

// =====================================================================
// AI ASSISTANT SYSTEM PROMPTS
// =====================================================================

function getAssistantSystemPrompt(section: string): string {
  const base =
    "You are a BlueAlly AI consultant helping a user refine their AI assessment. Be concise, specific, and actionable.";

  const sectionPrompts: Record<string, string> = {
    themes: `${base} Help the user write compelling strategic themes with clear current states, measurable target states, and quantified primary/secondary drivers.`,
    functions: `${base} Help the user define business functions and KPIs with realistic baselines, ambitious but achievable targets, and appropriate timeframes.`,
    friction: `${base} Help the user describe friction points clearly, estimate labor hours accurately, and link them to the right strategic themes.`,
    usecases: `${base} Help the user design AI use cases with appropriate AI primitives and agentic design patterns. Recommend the best pattern based on task complexity, coordination needs, and quality requirements.`,
    benefits: `${base} Help the user validate financial assumptions with industry benchmarks. Ensure formulas are conservative and defensible.`,
    workflows: `${base} Help the user map current-state workflows and design AI-powered target-state workflows with appropriate human-in-the-loop checkpoints.`,
    readiness: `${base} Help the user assess organizational readiness across data quality, technical infrastructure, organizational capacity, and governance dimensions.`,
    general: base,
  };

  return sectionPrompts[section] || sectionPrompts.general;
}
