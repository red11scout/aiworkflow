import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { SCENARIO_MULTIPLIERS, parseCurrencyString, formatCurrency } from "@shared/formulas";
import { nanoid } from "nanoid";
import type { WorkflowMap, InteractiveWorkflowNode, HITLCheckpoint } from "@shared/types";

// ---------------------------------------------------------------------------
// Inline JSON parser — extracts structured data from imported discover JSON
// ---------------------------------------------------------------------------

function parseImportedJSON(raw: any): Record<string, any> {
  const steps = raw?.analysis?.steps || [];
  const getStepData = (stepNum: number) => {
    const step = steps.find((s: any) => s.step === stepNum);
    return step?.data || [];
  };

  return {
    companyOverview: steps.find((s: any) => s.step === 0)?.content || "",
    strategicThemes: getStepData(1),
    businessFunctions: getStepData(2),
    frictionPoints: getStepData(3),
    useCases: getStepData(4),
    benefits: getStepData(5),
    readiness: getStepData(6),
    priorities: getStepData(7),
    executiveSummary: raw?.analysis?.executiveSummary || null,
    executiveDashboard: raw?.analysis?.executiveDashboard || null,
    scenarioAnalysis: raw?.analysis?.scenarioAnalysis || null,
    multiYear: raw?.analysis?.multiYearProjection || null,
    frictionRecovery: raw?.analysis?.frictionRecovery || null,
    analysisSummary: raw?.analysis?.summary || "",
    validationWarnings: raw?.analysis?.validationWarnings || [],
  };
}

// ---------------------------------------------------------------------------
// Simple benefit multiplier for conservative/optimistic scenarios
// ---------------------------------------------------------------------------

function applyBenefitMultiplier(benefits: any[], multiplier: { benefitMultiplier: number; probabilityMultiplier: number }): any[] {
  return benefits.map((b: any) => {
    const scale = multiplier.benefitMultiplier;
    const probScale = multiplier.probabilityMultiplier;
    const costVal = parseCurrencyString(b.costBenefit || "0") * scale;
    const revVal = parseCurrencyString(b.revenueBenefit || "0") * scale;
    const riskVal = parseCurrencyString(b.riskBenefit || "0") * scale;
    const cfVal = parseCurrencyString(b.cashFlowBenefit || "0") * scale;
    const total = costVal + revVal + riskVal + cfVal;
    const prob = Math.min(1, (b.probabilityOfSuccess || 0.7) * probScale);
    return {
      ...b,
      costBenefit: formatCurrency(costVal),
      revenueBenefit: formatCurrency(revVal),
      riskBenefit: formatCurrency(riskVal),
      cashFlowBenefit: formatCurrency(cfVal),
      totalAnnualValue: formatCurrency(total),
      expectedValue: formatCurrency(total * prob),
      probabilityOfSuccess: prob,
    };
  });
}

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

    // Always create a base scenario for the project
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
    } else {
      // Create empty base scenario so manual use cases can be added
      await storage.createScenario({
        projectId: project.id,
        name: "Base Case",
        versionType: "base",
        isActive: true,
        currentStep: 0,
        completedSteps: [],
      });
    }

    res.json(project);
  });

  app.get("/api/projects/:id", async (req, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const allScenarios = await storage.getScenariosByProject(project.id);
    const activeScenario = allScenarios.find((s) => s.isActive) || null;

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
        scenarioData.benefits = applyBenefitMultiplier(
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
      workforce_params: "workforceParams",
      assessment: "assessment",
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


  // AI workforce research — uses Claude to estimate workforce parameters for a company
  app.post("/api/ai/research-workforce", async (req, res) => {
    const { companyName, industry } = req.body;

    if (!companyName) {
      return res.status(400).json({ message: "Missing companyName" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        message: "AI assistant not configured. Set ANTHROPIC_API_KEY.",
      });
    }

    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });

      const response = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        system: `You are a workforce data researcher. Given a company name and industry, provide reasonable estimates for their workforce parameters based on publicly available information and industry benchmarks. If you can find specific data about the company, use it. Otherwise, provide realistic estimates based on the industry and company size class.

Return ONLY valid JSON with no markdown or code blocks. The JSON must have this exact structure:
{
  "totalEmployees": <number>,
  "avgHourlyRate": <number>,
  "burdenMultiplier": <number, typically 1.3-1.5>,
  "annualRevenue": <number>,
  "industry": "<string>",
  "workHoursPerYear": <number, typically 2080>
}`,
        messages: [
          {
            role: "user",
            content: `Research workforce parameters for: ${companyName}${industry ? ` (Industry: ${industry})` : ""}

Provide your best estimates for:
1. Total number of employees
2. Average hourly rate (fully loaded with benefits)
3. Burden multiplier (benefits/overhead on top of base salary)
4. Annual revenue
5. Industry classification
6. Standard work hours per year

Use publicly available data if possible. If the company is not well-known, estimate based on the industry provided.`,
          },
        ],
      });

      const rawText = response.content[0].type === "text" ? response.content[0].text : "";
      const text = rawText
        .replace(/^```(?:json)?\s*\n?/gm, "")
        .replace(/\n?```\s*$/gm, "")
        .trim();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(500).json({ message: "Failed to parse AI response" });
      }

      const parsed = JSON.parse(jsonMatch[0]);
      res.json(parsed);
    } catch (err: any) {
      console.error("Workforce research error:", err.message);
      res.status(500).json({ message: `Workforce research error: ${err.message}` });
    }
  });

  // Concurrency-limited parallel execution
  async function runWithConcurrency<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number,
  ): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    let nextIndex = 0;

    async function runNext(): Promise<void> {
      while (nextIndex < tasks.length) {
        const index = nextIndex++;
        results[index] = await tasks[index]();
      }
    }

    const workers = Array.from(
      { length: Math.min(concurrency, tasks.length) },
      () => runNext(),
    );
    await Promise.all(workers);
    return results;
  }

  // AI workflow generation — batch generates workflows for ALL use cases in a scenario
  app.post("/api/ai/generate-workflow", async (req, res) => {
    const { scenarioId, useCaseId, currentStateContext } = req.body;

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

    const allUseCases = (scenario.useCases as any[]) || [];
    const frictionPoints = (scenario.frictionPoints as any[]) || [];

    // If useCaseId is provided, only regenerate that one use case
    const useCases = useCaseId
      ? allUseCases.filter((uc: any) => uc.id === useCaseId)
      : allUseCases;

    if (useCases.length === 0) {
      return res.status(400).json({ message: "No use cases to generate" });
    }

    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });

      const CONCURRENCY = 3;

      const emptyMetricsFallback = {
        timeReduction: { before: "--", after: "--", improvement: "--" },
        costReduction: { before: "--", after: "--", improvement: "--" },
        qualityImprovement: { before: "--", after: "--", improvement: "--" },
        throughputIncrease: { before: "--", after: "--", improvement: "--" },
      };

      const tasks = useCases.map((uc: any) => async () => {
        const localDebug: string[] = [];

        try {
        const matchedFP = frictionPoints.find(
          (fp: any) => fp.frictionPoint === uc.targetFriction,
        );

        // If user has modified the current state, include it as context
        const currentStateSection = currentStateContext
          ? `
USER-DEFINED CURRENT STATE (use as baseline — the user has already mapped these steps):
${JSON.stringify(currentStateContext, null, 2)}

Generate the target state that optimizes this specific current-state workflow.`
          : `
Generate BOTH current state (5-8 steps showing the manual/legacy process) and target state.`;

        // Retry with exponential backoff for transient API errors
        const MAX_RETRIES = 2;
        let response: any;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            response = await client.messages.create({
              model: "claude-sonnet-4-5-20250929",
              max_tokens: 12000,
              system: `You are an expert AI workflow architect specializing in enterprise process transformation. Generate detailed workflow visualizations comparing current manual processes with AI-powered alternatives.

CRITICAL REQUIREMENTS:
1. Current State: 5-8 detailed steps showing the manual/legacy process with realistic durations, bottlenecks, and pain points
2. Target State: 5-8 steps showing the AI-enhanced process
3. EVERY target workflow MUST have at least ONE Human-in-the-Loop (HITL) checkpoint
4. Current state MUST identify bottlenecks (mark at least 1-2 steps as isBottleneck: true)
5. All durations must be realistic estimates grounded in the specific business function
6. Comparison metrics must show meaningful, realistic improvements
7. Return ONLY valid JSON — no markdown, no code blocks, no explanatory text

EPOCH FRAMEWORK — Categorize every HITL checkpoint using one of these categories:
- "ethical": Decisions with moral weight (bias mitigation, fairness, legal judgments)
- "political": High-stakes negotiations, stakeholder or regulatory sensitivity
- "operational": Edge cases, circuit breakers, domain expertise decisions
- "creative": Original strategy, brand voice, novel innovation
- "human": Tasks demanding empathy, trust, or personal connection

FRICTION TYPES — Tag current-state bottleneck steps with one of:
- "process": Manual steps, handoffs, redundant workflows
- "data": Quality issues, silos, availability gaps
- "technology": Legacy systems, integration failures
- "knowledge": Expertise gaps, institutional memory loss

AUTOMATION LEVELS for target-state steps:
- "full": Fully automated by AI, no human involvement
- "assisted": AI does the work, human reviews output
- "supervised": Human does the work with AI assistance
- "manual": No AI involvement (pure human step)`,
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
HITL CHECKPOINT: ${uc.hitlCheckpoint || "Not specified"}
DESIRED OUTCOMES: ${(uc.desiredOutcomes || []).join("; ") || "N/A"}
DATA TYPES: ${(uc.dataTypes || []).join(", ") || "N/A"}
INTEGRATIONS: ${(uc.integrations || []).join(", ") || "N/A"}
${currentStateSection}

Return JSON with this EXACT structure:
{
  "currentState": [
    {
      "id": "cs-1", "stepNumber": 1, "name": "Step name",
      "description": "Detailed description",
      "actorType": "human", "actorName": "Role title",
      "duration": "2 hours", "systems": ["System name"],
      "isBottleneck": true, "isDecisionPoint": false,
      "painPoints": ["Pain point description"],
      "frictionType": "process",
      "employeeCount": 3, "avgHourlyCost": 75,
      "hoursPerTask": 2, "tasksPerMonth": 100,
      "stepCategory": "working",
      "department": "Operations",
      "isDepartmentHandoff": false,
      "outputType": "report",
      "systemDetails": [{"name": "McLeod TMS", "dataType": "structured", "integrationAvailable": true, "integrationType": "api"}],
      "burdenMultiplier": 1.35
    }
  ],
  "targetState": [
    {
      "id": "ts-1", "stepNumber": 1, "name": "Step name",
      "description": "Detailed description",
      "actorType": "ai_agent", "actorName": "AI Agent name",
      "duration": "5 minutes", "systems": ["System name"],
      "isBottleneck": false, "isDecisionPoint": false,
      "painPoints": [],
      "isAIEnabled": true, "isHumanInTheLoop": false,
      "aiCapabilities": ["NLP", "Pattern Recognition"],
      "automationLevel": "full",
      "employeeCount": 1, "avgHourlyCost": 0,
      "hoursPerTask": 0.08, "tasksPerMonth": 100,
      "stepCategory": "working",
      "department": "Operations",
      "outputType": "data_entry",
      "aiApproach": "single_agent",
      "desiredAIOutputType": "Structured data extraction",
      "systemDetails": [{"name": "AI Pipeline", "dataType": "unstructured", "integrationAvailable": true, "integrationType": "api"}],
      "burdenMultiplier": 1.35
    },
    {
      "id": "ts-hitl-1", "stepNumber": 3, "name": "Review & Approve Output",
      "description": "Human reviewer validates AI output before proceeding",
      "actorType": "human", "actorName": "Senior Analyst",
      "duration": "15 minutes", "systems": ["Review Dashboard"],
      "isBottleneck": false, "isDecisionPoint": true,
      "painPoints": [],
      "isAIEnabled": false, "isHumanInTheLoop": true,
      "aiCapabilities": [],
      "automationLevel": "manual",
      "stepCategory": "review",
      "department": "Operations",
      "outputType": "approval",
      "epochCategory": "operational",
      "hitlDetails": "Quality gate: verify AI output accuracy before downstream consumption",
      "hitlCheckpoint": {
        "id": "hitl-1",
        "epochCategory": "operational",
        "description": "Quality gate: verify AI output accuracy before downstream consumption",
        "approverRole": "Senior Analyst",
        "isRequired": true,
        "estimatedMinutes": 15
      }
    }
  ],
  "comparisonMetrics": {
    "timeReduction": {"before": "45 days", "after": "7 days", "improvement": "84%"},
    "costReduction": {"before": "$9.8M/yr", "after": "$3.3M/yr", "improvement": "66%"},
    "qualityImprovement": {"before": "72% accuracy", "after": "94% accuracy", "improvement": "+22%"},
    "throughputIncrease": {"before": "100/month", "after": "500/month", "improvement": "5x"}
  }
}

IMPORTANT:
- Keep descriptions to 1-2 SHORT sentences each (under 30 words). Be concise.
- Use 5-6 steps per workflow, not more.
- Ground metrics in the friction point data. Cost "before" should align with friction annual cost.
- Include employeeCount, avgHourlyCost, hoursPerTask, tasksPerMonth on EVERY node for live cost calculations.
- At least 1 target-state node MUST have isHumanInTheLoop: true with a hitlCheckpoint object.
- Tag bottleneck current-state nodes with a frictionType.
- Include stepCategory on EVERY node: "working", "waiting_approval", "waiting_feedback", "waiting_external", "waiting_customer", "rework", "handoff", or "review". This identifies lag time where AI can reduce wait.
- Include department on every node to show cross-functional handoffs.
- Include outputType on every node: "report", "document", "decision", "notification", "data_entry", "email", "dashboard", "approval", "other".
- Include systemDetails array on every node with name, dataType, integrationAvailable, integrationType.
- On target-state AI nodes, include aiApproach: "primitive", "single_agent", or "multi_agent" and desiredAIOutputType.
- Set burdenMultiplier to 1.35 on every node (standard benefits loading).
- Mark department handoffs with isDepartmentHandoff: true when work transitions between departments.
- The COMPLETE JSON must fit within 8000 tokens. Be efficient.`,
            },
          ],
        });
            break; // Success — exit retry loop
          } catch (apiErr: any) {
            const retryable = apiErr.status === 429 || apiErr.status === 529 || apiErr.status === 503;
            if (retryable && attempt < MAX_RETRIES) {
              const delay = (attempt + 1) * 5000; // 5s, 10s
              localDebug.push(`API error ${apiErr.status} for "${uc.name}", retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
              await new Promise(r => setTimeout(r, delay));
            } else {
              throw apiErr; // Non-retryable or exhausted retries — let outer catch handle it
            }
          }
        }

        const rawText =
          response.content[0].type === "text" ? response.content[0].text : "";

        // Strip markdown code blocks if present
        const text = rawText
          .replace(/^```(?:json)?\s*\n?/gm, "")
          .replace(/\n?```\s*$/gm, "")
          .trim();

        localDebug.push(`Raw response length: ${rawText.length}, stripped: ${text.length}`);

        const jsonMatch = text.match(/\{[\s\S]*\}/);

        const emptyMetrics = {
          timeReduction: { before: "--", after: "--", improvement: "--" },
          costReduction: { before: "--", after: "--", improvement: "--" },
          qualityImprovement: { before: "--", after: "--", improvement: "--" },
          throughputIncrease: { before: "--", after: "--", improvement: "--" },
        };

        if (jsonMatch) {
          let jsonStr = jsonMatch[0];
          let workflow: any;
          try {
            workflow = JSON.parse(jsonStr);
          } catch {
            // Attempt to repair truncated JSON by closing open brackets
            localDebug.push("Initial parse failed — attempting JSON repair");
            let repaired = jsonStr;
            // Count unclosed brackets
            let braces = 0, brackets = 0;
            let inString = false, escape = false;
            for (const ch of repaired) {
              if (escape) { escape = false; continue; }
              if (ch === "\\") { escape = true; continue; }
              if (ch === '"') { inString = !inString; continue; }
              if (inString) continue;
              if (ch === '{') braces++;
              if (ch === '}') braces--;
              if (ch === '[') brackets++;
              if (ch === ']') brackets--;
            }
            // Remove trailing comma or partial value
            repaired = repaired.replace(/,\s*$/, "");
            // Close open brackets/braces
            for (let i = 0; i < brackets; i++) repaired += "]";
            for (let i = 0; i < braces; i++) repaired += "}";
            try {
              workflow = JSON.parse(repaired);
              localDebug.push("JSON repair succeeded");
            } catch (e2: any) {
              localDebug.push(`JSON repair also failed: ${e2.message}`);
              workflow = null;
            }
          }

          if (workflow) {
            localDebug.push(`Parsed keys: ${Object.keys(workflow).join(", ")}`);
            localDebug.push(`currentState: ${(workflow.currentState || []).length} nodes, targetState: ${(workflow.targetState || []).length} nodes`);

            const currentNodes = (workflow.currentState || []).map((node: any, i: number) => ({
              ...node,
              position: { x: 250, y: i * 150 },
            }));
            const targetNodes = (workflow.targetState || []).map((node: any, i: number) => ({
              ...node,
              position: { x: 250, y: i * 150 },
            }));

            return {
              workflowMap: {
                useCaseId: uc.id,
                useCaseName: uc.name,
                agenticPattern: uc.agenticPattern || "",
                patternRationale: uc.patternRationale || "",
                currentState: currentNodes,
                targetState: targetNodes,
                comparisonMetrics: workflow.comparisonMetrics || emptyMetrics,
                desiredOutcomes: uc.desiredOutcomes || [],
                dataTypes: uc.dataTypes || [],
                integrations: uc.integrations || [],
              } as WorkflowMap,
              debugEntries: localDebug,
            };
          } else {
            // Parse and repair both failed
            return {
              workflowMap: {
                useCaseId: uc.id,
                useCaseName: uc.name,
                agenticPattern: uc.agenticPattern || "",
                patternRationale: uc.patternRationale || "",
                currentState: [],
                targetState: [],
                comparisonMetrics: emptyMetrics,
                desiredOutcomes: uc.desiredOutcomes || [],
                dataTypes: uc.dataTypes || [],
                integrations: uc.integrations || [],
              } as WorkflowMap,
              debugEntries: localDebug,
            };
          }
        } else {
          localDebug.push(`NO JSON FOUND in response. Text starts with: ${text.substring(0, 200)}`);
          return {
            workflowMap: {
              useCaseId: uc.id,
              useCaseName: uc.name,
              agenticPattern: uc.agenticPattern || "",
              patternRationale: uc.patternRationale || "",
              currentState: [],
              targetState: [],
              comparisonMetrics: emptyMetrics,
              desiredOutcomes: uc.desiredOutcomes || [],
              dataTypes: uc.dataTypes || [],
              integrations: uc.integrations || [],
            } as WorkflowMap,
            debugEntries: localDebug,
          };
        }
        } catch (taskErr: any) {
          // Catch per-task errors (API timeouts, rate limits, network errors)
          // so one failure doesn't crash the entire batch
          localDebug.push(`TASK ERROR for "${uc.name}": ${taskErr.message}`);
          console.error(`Workflow task error for "${uc.name}":`, taskErr.message);
          return {
            workflowMap: {
              useCaseId: uc.id,
              useCaseName: uc.name,
              agenticPattern: uc.agenticPattern || "",
              patternRationale: uc.patternRationale || "",
              currentState: [],
              targetState: [],
              comparisonMetrics: emptyMetricsFallback,
              desiredOutcomes: uc.desiredOutcomes || [],
              dataTypes: uc.dataTypes || [],
              integrations: uc.integrations || [],
            } as WorkflowMap,
            debugEntries: localDebug,
          };
        }
      });

      const results = await runWithConcurrency(tasks, CONCURRENCY);

      const workflowMaps: WorkflowMap[] = [];
      const debugLog: string[] = [];
      for (const result of results) {
        workflowMaps.push(result.workflowMap);
        debugLog.push(...result.debugEntries);
      }

      // Debug info for troubleshooting
      const debugInfo = {
        totalMaps: workflowMaps.length,
        log: debugLog,
        mapSummaries: workflowMaps.map((m) => ({
          useCaseId: m.useCaseId,
          currentCount: m.currentState?.length || 0,
          targetCount: m.targetState?.length || 0,
        })),
      };

      // For single-use-case regeneration, merge with existing maps
      if (useCaseId && workflowMaps.length > 0) {
        const existingMaps = (scenario.workflowMaps as WorkflowMap[]) || [];
        const mergedMaps = existingMaps.map((m) =>
          m.useCaseId === useCaseId ? workflowMaps[0] : m,
        );
        // If the use case wasn't in existing maps, add it
        if (!existingMaps.some((m) => m.useCaseId === useCaseId)) {
          mergedMaps.push(workflowMaps[0]);
        }
        await storage.updateScenario(scenarioId, {
          workflowMaps: mergedMaps,
        } as any);
        res.json({ success: true, count: 1, workflowMaps: mergedMaps, debug: debugInfo });
      } else {
        await storage.updateScenario(scenarioId, {
          workflowMaps,
        } as any);
        res.json({ success: true, count: workflowMaps.length, workflowMaps, debug: debugInfo });
      }
    } catch (err: any) {
      console.error("Workflow generation error:", err.message, err.stack);
      const status = err.status || 500;
      res.status(status).json({
        message: `Workflow generation error: ${err.message || "Unknown error"}`,
      });
    }
  });

  // =====================================================================
  // AI — ASSESSMENT MODULE
  // =====================================================================

  app.post("/api/ai/assessment-mapping", async (req, res) => {
    const { useCases, questions } = req.body;
    if (!useCases?.length || !questions?.length) {
      return res.status(400).json({ message: "Missing useCases or questions" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: "AI assistant not configured. Set ANTHROPIC_API_KEY." });
    }

    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey });

      const useCaseList = useCases.map((uc: any) => `- ID: ${uc.id}, Name: ${uc.name}, Description: ${uc.description || "N/A"}`).join("\n");
      const questionList = questions.map((q: any) => `- ID: ${q.id}, Category: ${q.category}, SubCategory: ${q.subCategory}, Question: ${q.questionText}`).join("\n");

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: `You are analyzing an AI readiness assessment for an organization. Map each assessment question to the use cases it directly impacts.

A question impacts a use case if the capability it assesses would directly affect the success of implementing that use case.

USE CASES:
${useCaseList}

ASSESSMENT QUESTIONS:
${questionList}

Return ONLY valid JSON with this exact format:
{
  "mappings": {
    "QUESTION_ID": ["USE_CASE_ID_1", "USE_CASE_ID_2"],
    ...
  }
}

Rules:
- Each question should map to 0-5 use cases based on direct relevance
- Not every question maps to every use case — be selective
- Focus on direct impact relationships, not tangential connections
- Data-related questions map to use cases that need specific data types
- Infrastructure questions map to use cases with specific compute/platform needs
- Skills questions map to use cases requiring specific expertise
- Governance questions map to use cases with compliance/risk implications`
        }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(500).json({ message: "Failed to parse AI response" });
      }

      const parsed = JSON.parse(jsonMatch[0]);
      res.json(parsed);
    } catch (error: any) {
      console.error("Assessment mapping error:", error.message);
      res.status(500).json({ message: "Failed to generate assessment mapping" });
    }
  });

  app.post("/api/ai/assessment-guidance", async (req, res) => {
    const { gaps, companyName, industry } = req.body;
    if (!gaps?.length) {
      return res.status(400).json({ message: "No gaps provided" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: "AI assistant not configured. Set ANTHROPIC_API_KEY." });
    }

    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey });

      const gapList = gaps.map((g: any) => `- ${g.questionId} (${g.category} > ${g.subCategory}): "${g.questionText}" — Current: Level ${g.currentScore}, Target: Level 4, Gap: ${g.gapSize}`).join("\n");

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: `You are advising ${companyName || "an organization"}${industry ? ` in the ${industry} industry` : ""} on improving their AI readiness.

The following gaps were identified in their assessment. For each gap, provide a concise, actionable recommendation (1-2 sentences) explaining what specific steps the organization should take to improve from their current maturity level to at least Level 4 (Scaling).

GAPS:
${gapList}

Return ONLY valid JSON with this exact format:
{
  "guidance": {
    "QUESTION_ID": "Actionable recommendation text here",
    ...
  }
}

Guidelines:
- Be specific and actionable, not generic
- Reference industry best practices where relevant
- Consider the organization's current level when recommending next steps
- Prioritize quick wins where possible`
        }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(500).json({ message: "Failed to parse AI response" });
      }

      const parsed = JSON.parse(jsonMatch[0]);
      res.json(parsed);
    } catch (error: any) {
      console.error("Assessment guidance error:", error.message);
      res.status(500).json({ message: "Failed to generate assessment guidance" });
    }
  });

  // =====================================================================
  // EXPORT & SHARING
  // =====================================================================

  app.post("/api/projects/:id/share", async (req, res) => {
    let { scenarioId } = req.body;
    const project = await storage.getProject(req.params.id);
    if (!project)
      return res.status(404).json({ message: "Project not found" });

    // Fall back to active scenario if no scenarioId provided
    if (!scenarioId) {
      const active = await storage.getActiveScenario(project.id);
      scenarioId = active?.id || "";
    }

    const code = nanoid(10);
    const link = await storage.createShareLink(
      project.id,
      scenarioId,
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
      assessment: scenario.assessment || null,
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

    // Compute workflow dashboard metrics for export
    const wfMaps = (scenario.workflowMaps as any[]) || [];

    function parseDurToHrs(duration: string): number {
      if (!duration || duration === "--") return 0;
      const lower = duration.toLowerCase().trim();
      const num = parseFloat(lower.replace(/[^0-9.]/g, ""));
      if (isNaN(num)) return 0;
      if (lower.includes("day")) return num * 8;
      if (lower.includes("hour") || lower.includes("hr")) return num;
      if (lower.includes("min")) return num / 60;
      if (lower.includes("sec")) return num / 3600;
      if (lower.includes("week")) return num * 40;
      return num;
    }

    function parseCurr(value: string): number {
      if (!value) return 0;
      let clean = value.replace(/[,$\s]/g, "");
      clean = clean.replace(/\/(yr|year|mo|month|quarter|qtr|week|day|annual)$/i, "");
      clean = clean.replace(/per\s*(year|month|quarter|week|day|annum)$/i, "");
      if (/m$/i.test(clean)) return parseFloat(clean) * 1_000_000;
      if (/k$/i.test(clean)) return parseFloat(clean) * 1_000;
      if (/b$/i.test(clean)) return parseFloat(clean) * 1_000_000_000;
      return parseFloat(clean) || 0;
    }

    const perUseCaseMetrics = wfMaps.map((wf: any) => {
      let currentHours = 0, targetHours = 0, aiEnabled = 0;
      for (const n of (wf.currentState || [])) currentHours += parseDurToHrs(n.duration);
      for (const n of (wf.targetState || [])) {
        targetHours += parseDurToHrs(n.duration);
        if (n.isAIEnabled) aiEnabled++;
      }
      const totalTarget = (wf.targetState || []).length;
      let costSaved = 0;
      if (wf.comparisonMetrics?.costReduction) {
        const before = parseCurr(wf.comparisonMetrics.costReduction.before || "0");
        const after = parseCurr(wf.comparisonMetrics.costReduction.after || "0");
        costSaved = Math.max(0, before - after);
      }
      return {
        useCaseId: wf.useCaseId,
        useCaseName: wf.useCaseName,
        currentHours: Math.round(currentHours),
        targetHours: Math.round(targetHours),
        hoursSaved: Math.round(Math.max(0, currentHours - targetHours)),
        costSaved,
        automationPct: totalTarget > 0 ? Math.round((aiEnabled / totalTarget) * 100) : 0,
      };
    });

    const dashboardMetrics = {
      totalHoursSaved: perUseCaseMetrics.reduce((s: number, r: any) => s + r.hoursSaved, 0),
      totalCostSaved: perUseCaseMetrics.reduce((s: number, r: any) => s + r.costSaved, 0),
      avgAutomation: perUseCaseMetrics.length > 0
        ? Math.round(perUseCaseMetrics.reduce((s: number, r: any) => s + r.automationPct, 0) / perUseCaseMetrics.length)
        : 0,
      useCaseCount: perUseCaseMetrics.length,
      perUseCase: perUseCaseMetrics,
    };

    // Aggregate systems, integration types, and data types across workflows
    const sysMap = new Map<string, Set<string>>();
    const intTypeCount = new Map<string, number>();
    const dataTypeCount = new Map<string, number>();

    for (const wf of wfMaps) {
      const allNodes = [...(wf.currentState || []), ...(wf.targetState || [])];
      for (const node of allNodes) {
        for (const sys of (node.systems || [])) {
          if (!sys) continue;
          if (!sysMap.has(sys)) sysMap.set(sys, new Set());
          sysMap.get(sys)!.add(wf.useCaseName);
        }
        for (const sd of (node.systemDetails || [])) {
          if (sd.name) {
            if (!sysMap.has(sd.name)) sysMap.set(sd.name, new Set());
            sysMap.get(sd.name)!.add(wf.useCaseName);
          }
          if (sd.integrationType) intTypeCount.set(sd.integrationType, (intTypeCount.get(sd.integrationType) || 0) + 1);
          if (sd.dataType) dataTypeCount.set(sd.dataType, (dataTypeCount.get(sd.dataType) || 0) + 1);
        }
      }
      for (const dt of (wf.dataTypes || [])) {
        if (dt) dataTypeCount.set(dt, (dataTypeCount.get(dt) || 0) + 1);
      }
      for (const ig of (wf.integrations || [])) {
        if (!ig) continue;
        if (!sysMap.has(ig)) sysMap.set(ig, new Set());
        sysMap.get(ig)!.add(wf.useCaseName);
      }
    }

    const systemsSummary = {
      systems: [...sysMap.entries()]
        .map(([name, ucs]) => ({ name, useCaseCount: ucs.size, useCases: [...ucs] }))
        .sort((a, b) => b.useCaseCount - a.useCaseCount),
      integrationTypes: Object.fromEntries(intTypeCount),
      dataTypes: Object.fromEntries(dataTypeCount),
    };

    const exportData = {
      exportVersion: "2.1",
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
      dashboardMetrics,
      systemsSummary,
      workforceParams: (scenario as any).workforceParams || null,
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

  app.get("/api/projects/:id/assessment-export", async (req, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const scenario = await storage.getActiveScenario(project.id);
    if (!scenario?.assessment) {
      return res.status(404).json({ message: "No assessment data found" });
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      company: {
        name: project.companyName,
        industry: project.industry,
      },
      assessment: scenario.assessment,
      useCases: scenario.useCases || [],
      benefits: scenario.benefits || [],
      readiness: scenario.readiness || [],
      priorities: scenario.priorities || [],
    };

    const filename = `${(project.companyName || "assessment").replace(/[^a-zA-Z0-9]/g, "-")}-ai-assessment.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.json(exportData);
  });

  // Assessment template Excel download (with use-case mappings pre-populated)
  app.get("/api/projects/:id/assessment-template", async (req, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const scenario = await storage.getActiveScenario(project.id);
    if (!scenario) return res.status(404).json({ message: "Scenario not found" });

    try {
      const { generateAssessmentTemplate } = await import("./export-service");
      const buffer = await generateAssessmentTemplate(project, scenario);

      const filename = `${project.companyName?.replace(/[^a-zA-Z0-9]/g, "_") || "Assessment"}_AI_Assessment_Template.xlsx`;
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      console.error("Assessment template generation error:", error.message);
      res.status(500).json({ message: `Failed to generate template: ${error.message}` });
    }
  });

  // Assessment Excel upload — parse completed template back into answer data
  app.post("/api/projects/:id/assessment-upload", async (req, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const { fileBase64 } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ message: "Missing fileBase64 in request body" });
    }

    try {
      const fileBuffer = Buffer.from(fileBase64, "base64");
      const { parseAssessmentUpload } = await import("./export-service");
      const result = await parseAssessmentUpload(fileBuffer);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        message: `Failed to parse assessment file: ${error.message}`,
      });
    }
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
