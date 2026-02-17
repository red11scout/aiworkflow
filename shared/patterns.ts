export interface AgenticPattern {
  id: string;
  name: string;
  category: "core" | "single_agent" | "multi_agent";
  description: string;
  whenToUse: string[];
  tradeoffs: { pros: string[]; cons: string[] };
  complexity: "low" | "medium" | "high" | "very_high";
  primitives: string[];
  exampleUseCases: string[];
}

export const AI_PRIMITIVES = [
  "Reasoning",
  "Planning",
  "Tool Use",
  "Memory",
  "Reflection",
  "Learning",
] as const;

export type AIPrimitive = (typeof AI_PRIMITIVES)[number];

export const AGENTIC_PATTERNS: AgenticPattern[] = [
  // Core Patterns (Andrew Ng's 4 foundations)
  {
    id: "reflection",
    name: "Reflection (Self-Critique Loop)",
    category: "core",
    description:
      "AI critiques and refines its own outputs iteratively. A generator-critic pair or self-check loop where the model evaluates its work and improves it across multiple passes.",
    whenToUse: [
      "Output quality is critical and worth extra latency",
      "Tasks with clear evaluation criteria (code correctness, factual accuracy)",
      "Content generation where polish matters (reports, proposals)",
      "Fact-checking and compliance verification",
    ],
    tradeoffs: {
      pros: [
        "Significantly improves output quality",
        "Catches errors before delivery",
        "Self-correcting without human intervention",
      ],
      cons: [
        "Increases latency (2-3x per reflection cycle)",
        "Higher token consumption",
        "May over-optimize or enter infinite loops without bounds",
      ],
    },
    complexity: "low",
    primitives: ["Reasoning", "Reflection"],
    exampleUseCases: [
      "Code generation with test validation",
      "Report writing with fact-checking",
      "Compliance content review",
    ],
  },
  {
    id: "tool_use",
    name: "Tool Use (LLM + Tools)",
    category: "core",
    description:
      "Agent extends its capabilities by invoking external APIs, databases, or tools during reasoning. The LLM decides when and which tool to call based on the task context.",
    whenToUse: [
      "Tasks require real-time data (APIs, databases, web search)",
      "Calculations or data transformations beyond LLM capabilities",
      "Integration with existing enterprise systems",
      "Actions that modify external state (CRUD operations)",
    ],
    tradeoffs: {
      pros: [
        "Extends LLM beyond text generation",
        "Enables real-time data access",
        "Can trigger actions in external systems",
      ],
      cons: [
        "Requires tool API design and maintenance",
        "Error handling for tool failures needed",
        "Security concerns with external system access",
      ],
    },
    complexity: "medium",
    primitives: ["Reasoning", "Tool Use"],
    exampleUseCases: [
      "Research assistants with web search",
      "Database query and reporting",
      "Customer support with CRM integration",
    ],
  },
  {
    id: "planning",
    name: "Planning (Task Decomposition)",
    category: "core",
    description:
      "Breaks complex problems into explicit sub-tasks with execution order. Uses chain-of-thought reasoning to create a plan before executing, enabling structured problem-solving.",
    whenToUse: [
      "Complex multi-step tasks with dependencies",
      "Tasks requiring strategic sequencing",
      "Problems where the approach matters as much as the answer",
      "Projects that benefit from showing work/reasoning",
    ],
    tradeoffs: {
      pros: [
        "Handles complex problems systematically",
        "Transparent reasoning process",
        "Can recover from sub-task failures",
      ],
      cons: [
        "Upfront planning adds latency",
        "Plans may not survive contact with reality",
        "Over-planning for simple tasks wastes resources",
      ],
    },
    complexity: "medium",
    primitives: ["Reasoning", "Planning", "Memory"],
    exampleUseCases: [
      "Strategic decision support",
      "Complex research and analysis",
      "Project planning and task management",
    ],
  },
  {
    id: "multi_agent",
    name: "Multi-Agent Collaboration",
    category: "core",
    description:
      "Multiple specialized agents work together under orchestration or coordination. Each agent has specific expertise and tools, and they communicate to solve complex problems.",
    whenToUse: [
      "Tasks requiring diverse expertise areas",
      "Complex workflows with distinct phases",
      "Problems benefiting from multiple perspectives",
      "Enterprise workflows spanning departments",
    ],
    tradeoffs: {
      pros: [
        "Combines diverse expertise effectively",
        "Scalable to very complex problems",
        "Agents can be developed and tested independently",
      ],
      cons: [
        "Highest complexity to build and debug",
        "Inter-agent communication overhead (translation tax)",
        "Requires careful orchestration design",
      ],
    },
    complexity: "high",
    primitives: ["Reasoning", "Planning", "Tool Use", "Memory"],
    exampleUseCases: [
      "Enterprise workflow automation",
      "Complex QA with multiple review stages",
      "Multi-department analysis and reporting",
    ],
  },

  // Advanced Single-Agent Pattern
  {
    id: "react",
    name: "ReAct (Reason + Act Loop)",
    category: "single_agent",
    description:
      "Alternates between Thought (reasoning about what to do), Action (executing a tool call), and Observation (processing the result). Maintains state through conversation history for adaptive exploration.",
    whenToUse: [
      "Exploratory tasks where the path isn't known upfront",
      "Data analysis requiring iterative investigation",
      "Troubleshooting and debugging scenarios",
      "Tasks requiring adaptive strategy based on intermediate results",
    ],
    tradeoffs: {
      pros: [
        "Highly adaptive to new information",
        "Natural reasoning process visible",
        "Good for exploratory and diagnostic tasks",
      ],
      cons: [
        "Can get stuck in loops",
        "Higher token usage from reasoning traces",
        "May hit context limits on long explorations",
      ],
    },
    complexity: "medium",
    primitives: ["Reasoning", "Tool Use", "Memory"],
    exampleUseCases: [
      "Data analysis and investigation",
      "Troubleshooting workflows",
      "Research with iterative search",
    ],
  },

  // Advanced Multi-Agent Patterns
  {
    id: "orchestrator_worker",
    name: "Orchestrator-Worker",
    category: "multi_agent",
    description:
      "A central manager agent coordinates specialist worker agents. The orchestrator decomposes tasks, assigns them to workers, and synthesizes results. Supports hierarchical decomposition for very complex tasks.",
    whenToUse: [
      "Complex tasks requiring multiple specialist skills",
      "Workflows with clear decomposition into sub-tasks",
      "When different phases need different expertise",
      "Enterprise processes spanning multiple systems",
    ],
    tradeoffs: {
      pros: [
        "Clear structure and accountability",
        "Specialists can be optimized independently",
        "Supports hierarchical complexity",
      ],
      cons: [
        "Orchestrator is a single point of failure",
        "Translation tax between agents",
        "Higher latency from coordination overhead",
      ],
    },
    complexity: "high",
    primitives: ["Reasoning", "Planning", "Tool Use", "Memory"],
    exampleUseCases: [
      "Document processing pipelines",
      "Multi-stage content generation",
      "Complex analysis with parallel specialists",
    ],
  },
  {
    id: "agent_handoff",
    name: "Agent Handoff (Delegation)",
    category: "multi_agent",
    description:
      "Decentralized pattern where agents hand off control dynamically. Each agent decides whether to solve the problem or delegate to a more appropriate specialist based on the task at hand.",
    whenToUse: [
      "Triage and routing scenarios",
      "Customer service with specialized departments",
      "Tasks where the appropriate specialist isn't known upfront",
      "Dynamic workflows that change based on input",
    ],
    tradeoffs: {
      pros: [
        "Flexible and adaptive routing",
        "No single point of failure",
        "Natural for customer-service-like flows",
      ],
      cons: [
        "Harder to predict execution flow",
        "Risk of infinite delegation loops",
        "Requires clear handoff protocols",
      ],
    },
    complexity: "high",
    primitives: ["Reasoning", "Planning", "Memory"],
    exampleUseCases: [
      "Customer service routing",
      "IT helpdesk ticket triage",
      "Multi-department request handling",
    ],
  },
  {
    id: "parallelization",
    name: "Parallelization (Concurrent Agents)",
    category: "multi_agent",
    description:
      "Multiple agents work simultaneously on independent sub-tasks. Can be used for speed (parallel processing) or robustness (ensemble voting). Requires a synthesis step to merge results.",
    whenToUse: [
      "Tasks that can be decomposed into independent sub-tasks",
      "When speed is critical and sub-tasks don't depend on each other",
      "Ensemble approaches for higher accuracy",
      "Batch processing of similar items",
    ],
    tradeoffs: {
      pros: [
        "Significantly faster for parallelizable tasks",
        "Higher accuracy through ensemble voting",
        "Good utilization of compute resources",
      ],
      cons: [
        "Requires independent sub-tasks (can't parallelize dependencies)",
        "Needs a merge/synthesis step",
        "Higher total compute cost",
      ],
    },
    complexity: "medium",
    primitives: ["Reasoning", "Planning"],
    exampleUseCases: [
      "Parallel document analysis",
      "Multi-criteria evaluation",
      "Batch content generation",
    ],
  },
  {
    id: "group_chat",
    name: "Group Chat / Swarm",
    category: "multi_agent",
    description:
      "Free-form dialogue between multiple agents with shared memory. A moderator manages turn-taking while agents debate, critique, and build on each other's ideas collaboratively.",
    whenToUse: [
      "Creative brainstorming and ideation",
      "Policy debate and multi-perspective analysis",
      "Strategy development requiring diverse viewpoints",
      "Novel problem-solving where the approach is uncertain",
    ],
    tradeoffs: {
      pros: [
        "Generates diverse and creative solutions",
        "Natural multi-perspective analysis",
        "Can surface unexpected insights",
      ],
      cons: [
        "Most resource-intensive pattern",
        "Hard to control and predict",
        "Slow due to sequential turn-taking",
        "May generate off-topic discussions",
      ],
    },
    complexity: "very_high",
    primitives: ["Reasoning", "Memory", "Reflection"],
    exampleUseCases: [
      "Strategic planning sessions",
      "Creative content development",
      "Risk assessment with multiple perspectives",
    ],
  },
  {
    id: "generator_critic",
    name: "Generator-Critic (Review & Critique)",
    category: "multi_agent",
    description:
      "Specialized two-agent loop: one agent generates output, another reviews and critiques it. The generator then revises based on feedback. A focused version of the Reflection pattern with separate agents.",
    whenToUse: [
      "High-stakes outputs requiring quality assurance",
      "Code generation with review",
      "Regulatory content that needs compliance checking",
      "Any output where a second opinion adds value",
    ],
    tradeoffs: {
      pros: [
        "Clear separation of generation and review",
        "Critic can be specialized (e.g., compliance expert)",
        "Systematic quality improvement",
      ],
      cons: [
        "Double the agent cost per iteration",
        "Critic may be overly conservative",
        "Need to define clear acceptance criteria",
      ],
    },
    complexity: "medium",
    primitives: ["Reasoning", "Reflection"],
    exampleUseCases: [
      "Code review automation",
      "Legal document drafting with compliance review",
      "Marketing copy with brand compliance",
    ],
  },
];

export const PATTERN_CATEGORIES = {
  core: "Core Patterns",
  single_agent: "Advanced Single-Agent",
  multi_agent: "Advanced Multi-Agent",
} as const;

export function getPatternById(id: string): AgenticPattern | undefined {
  return AGENTIC_PATTERNS.find((p) => p.id === id);
}

export function getPatternsByCategory(
  category: AgenticPattern["category"],
): AgenticPattern[] {
  return AGENTIC_PATTERNS.filter((p) => p.category === category);
}
