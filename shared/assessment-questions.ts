import type { AssessmentCategory, AssessmentQuestion, AssessmentStatus, MaturityLevel } from "./types";

// =========================================================================
// MATURITY LEVELS — 1-5 scale descriptions
// =========================================================================

export const MATURITY_LEVELS: Record<MaturityLevel, { label: string; description: string }> = {
  1: { label: "Exploring", description: "Beginning to understand AI opportunities; no formal capability" },
  2: { label: "Planning", description: "Formalizing AI strategy and requirements; limited execution" },
  3: { label: "Implementing", description: "Actively building AI capabilities; foundational work in place" },
  4: { label: "Scaling", description: "Expanding AI across the organization; mature processes" },
  5: { label: "Realizing", description: "AI embedded in operations; sustained value and continuous improvement" },
};

// =========================================================================
// ASSESSMENT STATUS THRESHOLDS — sorted descending by min percentage
// =========================================================================

export const ASSESSMENT_STATUS_THRESHOLDS: Array<{
  key: AssessmentStatus;
  min: number;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}> = [
  { key: "ready", min: 0.80, label: "Ready", color: "#36bf78", bgColor: "bg-emerald-100 text-emerald-800", description: "Your organization has strong foundations for AI implementation" },
  { key: "developing", min: 0.60, label: "Developing", color: "#02a2fd", bgColor: "bg-blue-100 text-blue-800", description: "Good progress with some gaps to address before scaling" },
  { key: "building", min: 0.40, label: "Building", color: "#f59e0b", bgColor: "bg-amber-100 text-amber-800", description: "Foundational work needed in key areas" },
  { key: "early_stage", min: 0.00, label: "Early Stage", color: "#ef4444", bgColor: "bg-red-100 text-red-800", description: "Significant investment required across multiple dimensions" },
];

// =========================================================================
// CATEGORY METADATA — per-category display info and question counts
// =========================================================================

export const CATEGORY_METADATA: Record<AssessmentCategory, {
  label: string;
  questionCount: number;
  weightSum: number;
  maxWeightedScore: number;
  color: string;
  icon: string;
  description: string;
}> = {
  skills: { label: "Skills", questionCount: 15, weightSum: 22, maxWeightedScore: 110, color: "#8b5cf6", icon: "Users", description: "Evaluate workforce capabilities, identify skill gaps, assess AI/ML expertise, technical proficiency, and change management readiness." },
  data: { label: "Data", questionCount: 18, weightSum: 27, maxWeightedScore: 135, color: "#02a2fd", icon: "Database", description: "Evaluate data availability, quality, accessibility, and governance. Assess historical data, CRM records, and project outcomes." },
  infrastructure: { label: "Infrastructure", questionCount: 16, weightSum: 23, maxWeightedScore: 115, color: "#f59e0b", icon: "Server", description: "Evaluate compute capacity, GPU resources, storage systems, networking, security, and operational capabilities for AI workloads." },
  governance: { label: "Governance Framework", questionCount: 18, weightSum: 28, maxWeightedScore: 140, color: "#36bf78", icon: "Shield", description: "Evaluate AI governance policies, decision-making structures, compliance requirements, ethical guidelines, and organizational accountability." },
};

// =========================================================================
// ASSESSMENT QUESTIONS — 67 questions across 4 categories
// useCasesImpacted is intentionally empty — populated by AI mapping agent
// =========================================================================

export const ASSESSMENT_QUESTIONS: Omit<AssessmentQuestion, "useCasesImpacted">[] = [
  // ===========================================================
  // SKILLS (15 questions, weight sum = 22)
  // ===========================================================

  // --- AI/ML Expertise (3 questions) ---
  {
    id: "SKL-001",
    category: "skills",
    subCategory: "AI/ML Expertise",
    questionText: "What is the current level of Artificial Intelligence and Machine Learning expertise in the organization?",
    hint: "Assess data science, machine learning engineering, and Artificial Intelligence development capabilities",
    weight: 2,
  },
  {
    id: "SKL-002",
    category: "skills",
    subCategory: "AI/ML Expertise",
    questionText: "Are there data scientists or Machine Learning engineers on staff?",
    hint: "Evaluate in-house technical talent for Artificial Intelligence model development",
    weight: 2,
  },
  {
    id: "SKL-003",
    category: "skills",
    subCategory: "AI/ML Expertise",
    questionText: "Does the team have capability for model training and deployment?",
    hint: "Assess end-to-end Machine Learning pipeline capabilities from data preparation to production deployment",
    weight: 2,
  },

  // --- Technical Proficiency (3 questions) ---
  {
    id: "SKL-004",
    category: "skills",
    subCategory: "Technical Proficiency",
    questionText: "What is the IT and business function team's automation tool proficiency?",
    hint: "Evaluate familiarity with Robotic Process Automation, workflow automation, and integration platforms",
    weight: 1,
  },
  {
    id: "SKL-005",
    category: "skills",
    subCategory: "Technical Proficiency",
    questionText: "How would you rate data literacy across the organization?",
    hint: "Assess ability to interpret data, create reports, and make data-driven decisions",
    weight: 1,
  },
  {
    id: "SKL-006",
    category: "skills",
    subCategory: "Technical Proficiency",
    questionText: "Does Information Technology staff have Artificial Intelligence infrastructure experience?",
    hint: "Evaluate cloud platform, containerization, and Artificial Intelligence-specific infrastructure skills",
    weight: 2,
  },

  // --- Training & Development (3 questions) ---
  {
    id: "SKL-007",
    category: "skills",
    subCategory: "Training & Development",
    questionText: "What current training programs exist for new technology?",
    hint: "Evaluate existing training infrastructure and technology education programs",
    weight: 1,
  },
  {
    id: "SKL-008",
    category: "skills",
    subCategory: "Training & Development",
    questionText: "What are the training delivery methods and capacity?",
    hint: "Assess online, classroom, mentoring, and self-paced learning availability",
    weight: 1,
  },
  {
    id: "SKL-009",
    category: "skills",
    subCategory: "Training & Development",
    questionText: "How mature is the documentation and knowledge transfer process?",
    hint: "Evaluate knowledge management, documentation standards, and institutional learning",
    weight: 1,
  },

  // --- Change Readiness (3 questions) ---
  {
    id: "SKL-010",
    category: "skills",
    subCategory: "Change Readiness",
    questionText: "What is the workforce receptivity to Artificial Intelligence automation?",
    hint: "Assess employee attitudes toward Artificial Intelligence adoption and process changes",
    weight: 2,
  },
  {
    id: "SKL-011",
    category: "skills",
    subCategory: "Change Readiness",
    questionText: "What change management experience exists in the organization?",
    hint: "Evaluate prior experience with large-scale technology or process transformations",
    weight: 1,
  },
  {
    id: "SKL-012",
    category: "skills",
    subCategory: "Change Readiness",
    questionText: "Are subject matter experts available to support implementation?",
    hint: "Identify domain experts who can validate Artificial Intelligence outputs and guide training",
    weight: 2,
  },

  // --- Leadership (2 questions) ---
  {
    id: "SKL-013",
    category: "skills",
    subCategory: "Leadership",
    questionText: "Is there executive sponsorship for Artificial Intelligence initiatives?",
    hint: "Evaluate C-suite commitment, budget allocation, and strategic priority for Artificial Intelligence",
    weight: 2,
  },
  {
    id: "SKL-014",
    category: "skills",
    subCategory: "Leadership",
    questionText: "Are cross-functional Artificial Intelligence champions identified?",
    hint: "Assess presence of Artificial Intelligence advocates across business units and functions",
    weight: 1,
  },

  // --- Culture (1 question) ---
  {
    id: "SKL-015",
    category: "skills",
    subCategory: "Culture",
    questionText: "What is the psychological safety for Artificial Intelligence experimentation?",
    hint: "Evaluate organizational tolerance for failure and innovation in Artificial Intelligence projects",
    weight: 1,
  },

  // ===========================================================
  // DATA (18 questions, weight sum = 27)
  // ===========================================================

  // --- Data Availability (4 questions) ---
  {
    id: "DAT-001",
    category: "data",
    subCategory: "Data Availability",
    questionText: "Where is historical proposal and project data stored?",
    hint: "Identify data repositories, Content Management Systems, and record-keeping systems",
    weight: 2,
  },
  {
    id: "DAT-002",
    category: "data",
    subCategory: "Data Availability",
    questionText: "What volume of data is available for model training?",
    hint: "Assess quantity of labeled examples, historical records, and training datasets",
    weight: 2,
  },
  {
    id: "DAT-003",
    category: "data",
    subCategory: "Data Availability",
    questionText: "Is the data repository centralized or distributed?",
    hint: "Evaluate data architecture and accessibility across systems",
    weight: 1,
  },
  {
    id: "DAT-004",
    category: "data",
    subCategory: "Data Availability",
    questionText: "What formats are used (structured, unstructured)?",
    hint: "Assess data format diversity and transformation requirements",
    weight: 1,
  },

  // --- Data Quality (5 questions) ---
  {
    id: "DAT-005",
    category: "data",
    subCategory: "Data Quality",
    questionText: "How complete are the historical data records?",
    hint: "Evaluate completeness of historical data records and documentation",
    weight: 2,
  },
  {
    id: "DAT-006",
    category: "data",
    subCategory: "Data Quality",
    questionText: "What is the data accuracy and consistency level?",
    hint: "Assess data validation processes and error rates",
    weight: 2,
  },
  {
    id: "DAT-007",
    category: "data",
    subCategory: "Data Quality",
    questionText: "Is there labeled data linking proposals to outcomes?",
    hint: "Evaluate supervised learning readiness and outcome correlation data",
    weight: 2,
  },
  {
    id: "DAT-008",
    category: "data",
    subCategory: "Data Quality",
    questionText: "What data documentation and metadata exists?",
    hint: "Assess data dictionaries, lineage tracking, and documentation standards",
    weight: 1,
  },
  {
    id: "DAT-009",
    category: "data",
    subCategory: "Data Quality",
    questionText: "Are real-time data quality Service Level Objectives (SLOs) defined?",
    hint: "Evaluate monitoring and alerting for data quality degradation",
    weight: 1,
  },

  // --- Data Governance (4 questions) ---
  {
    id: "DAT-010",
    category: "data",
    subCategory: "Data Governance",
    questionText: "What data governance policies are in place?",
    hint: "Evaluate data ownership, access controls, and governance frameworks",
    weight: 2,
  },
  {
    id: "DAT-011",
    category: "data",
    subCategory: "Data Governance",
    questionText: "What are the security and privacy requirements?",
    hint: "Assess data classification, encryption, and privacy compliance requirements",
    weight: 2,
  },
  {
    id: "DAT-012",
    category: "data",
    subCategory: "Data Governance",
    questionText: "Is there automated data classification?",
    hint: "Evaluate automated tagging, sensitivity detection, and classification tools",
    weight: 1,
  },
  {
    id: "DAT-013",
    category: "data",
    subCategory: "Data Governance",
    questionText: "What regulatory compliance requirements exist?",
    hint: "Identify industry-specific regulations affecting data use in Artificial Intelligence",
    weight: 1,
  },

  // --- Data Integration (3 questions) ---
  {
    id: "DAT-014",
    category: "data",
    subCategory: "Data Integration",
    questionText: "What data silos require integration?",
    hint: "Identify disconnected data sources that need to be unified for Artificial Intelligence",
    weight: 2,
  },
  {
    id: "DAT-015",
    category: "data",
    subCategory: "Data Integration",
    questionText: "What data extraction and Application Programming Interface (API) capabilities exist?",
    hint: "Assess API availability, ETL tools, and data extraction capabilities",
    weight: 1,
  },
  {
    id: "DAT-016",
    category: "data",
    subCategory: "Data Integration",
    questionText: "What is the current data pipeline maturity?",
    hint: "Evaluate automated data ingestion, transformation, and delivery capabilities",
    weight: 2,
  },

  // --- Data Architecture (2 questions) ---
  {
    id: "DAT-017",
    category: "data",
    subCategory: "Data Architecture",
    questionText: "Is there a unified data catalog or lakehouse?",
    hint: "Assess centralized data discovery and access capabilities",
    weight: 1,
  },
  {
    id: "DAT-018",
    category: "data",
    subCategory: "Data Architecture",
    questionText: "Are data products defined with clear ownership?",
    hint: "Evaluate data product thinking and domain-driven data ownership",
    weight: 1,
  },

  // ===========================================================
  // INFRASTRUCTURE (16 questions, weight sum = 23)
  // ===========================================================

  // --- Compute & Storage (4 questions) ---
  {
    id: "INF-001",
    category: "infrastructure",
    subCategory: "Compute & Storage",
    questionText: "What compute infrastructure exists for Artificial Intelligence workloads?",
    hint: "Evaluate cloud and on-premises compute resources for Artificial Intelligence training and inference",
    weight: 2,
  },
  {
    id: "INF-002",
    category: "infrastructure",
    subCategory: "Compute & Storage",
    questionText: "What Graphics Processing Unit (GPU) resources are available for Artificial Intelligence and Machine Learning?",
    hint: "Assess GPU availability for model training and inference workloads",
    weight: 2,
  },
  {
    id: "INF-003",
    category: "infrastructure",
    subCategory: "Compute & Storage",
    questionText: "What is the storage capacity and performance?",
    hint: "Evaluate storage systems for large dataset handling and model artifacts",
    weight: 1,
  },
  {
    id: "INF-004",
    category: "infrastructure",
    subCategory: "Compute & Storage",
    questionText: "Is vector database capability available?",
    hint: "Assess infrastructure for embedding storage and similarity search (e.g., Pinecone, Weaviate, pgvector)",
    weight: 2,
  },

  // --- Networking & Security (4 questions) ---
  {
    id: "INF-005",
    category: "infrastructure",
    subCategory: "Networking & Security",
    questionText: "What is the network bandwidth and latency?",
    hint: "Evaluate network capacity for data transfer and real-time Artificial Intelligence inference",
    weight: 1,
  },
  {
    id: "INF-006",
    category: "infrastructure",
    subCategory: "Networking & Security",
    questionText: "What security infrastructure exists?",
    hint: "Assess firewalls, intrusion detection, and security monitoring for Artificial Intelligence systems",
    weight: 2,
  },
  {
    id: "INF-007",
    category: "infrastructure",
    subCategory: "Networking & Security",
    questionText: "What encryption capabilities are in place?",
    hint: "Evaluate data-at-rest and data-in-transit encryption for Artificial Intelligence pipelines",
    weight: 1,
  },
  {
    id: "INF-008",
    category: "infrastructure",
    subCategory: "Networking & Security",
    questionText: "Is network segmentation implemented?",
    hint: "Assess network isolation capabilities for Artificial Intelligence workloads",
    weight: 1,
  },

  // --- Operations & Management (4 questions) ---
  {
    id: "INF-009",
    category: "infrastructure",
    subCategory: "Operations & Management",
    questionText: "What container orchestration platforms are used?",
    hint: "Evaluate Kubernetes, Docker, and container management for Artificial Intelligence deployment",
    weight: 2,
  },
  {
    id: "INF-010",
    category: "infrastructure",
    subCategory: "Operations & Management",
    questionText: "What monitoring and observability exists?",
    hint: "Assess logging, metrics, and tracing capabilities for Artificial Intelligence systems",
    weight: 1,
  },
  {
    id: "INF-011",
    category: "infrastructure",
    subCategory: "Operations & Management",
    questionText: "What backup and disaster recovery capabilities exist?",
    hint: "Evaluate data protection and business continuity for Artificial Intelligence systems",
    weight: 1,
  },
  {
    id: "INF-012",
    category: "infrastructure",
    subCategory: "Operations & Management",
    questionText: "What is the Information Technology support model for Artificial Intelligence systems?",
    hint: "Assess operational support readiness for Artificial Intelligence workloads",
    weight: 1,
  },

  // --- AI Infrastructure (2 questions) ---
  {
    id: "INF-013",
    category: "infrastructure",
    subCategory: "AI Infrastructure",
    questionText: "Is there Machine Learning Operations (MLOps) or model registry capability?",
    hint: "Evaluate model versioning, experiment tracking, and deployment automation",
    weight: 2,
  },
  {
    id: "INF-014",
    category: "infrastructure",
    subCategory: "AI Infrastructure",
    questionText: "Are Continuous Integration/Continuous Deployment (CI/CD) pipelines available for Artificial Intelligence models?",
    hint: "Assess automated testing and deployment pipelines for Machine Learning models",
    weight: 1,
  },

  // --- Capacity Planning (2 questions) ---
  {
    id: "INF-015",
    category: "infrastructure",
    subCategory: "Capacity Planning",
    questionText: "What scalability provisions exist?",
    hint: "Evaluate auto-scaling, load balancing, and resource provisioning for Artificial Intelligence workloads",
    weight: 2,
  },
  {
    id: "INF-016",
    category: "infrastructure",
    subCategory: "Capacity Planning",
    questionText: "Is there physical or cloud expansion capacity?",
    hint: "Assess ability to scale compute and storage resources as Artificial Intelligence adoption grows",
    weight: 1,
  },

  // ===========================================================
  // GOVERNANCE FRAMEWORK (18 questions, weight sum = 28)
  // ===========================================================

  // --- AI Governance Policies (4 questions) ---
  {
    id: "GOV-001",
    category: "governance",
    subCategory: "AI Governance Policies",
    questionText: "What Artificial Intelligence governance policies and frameworks exist?",
    hint: "Evaluate formal Artificial Intelligence governance structure and policy documentation",
    weight: 2,
  },
  {
    id: "GOV-002",
    category: "governance",
    subCategory: "AI Governance Policies",
    questionText: "Are there Artificial Intelligence ethics guidelines and principles?",
    hint: "Assess ethical Artificial Intelligence framework covering fairness, transparency, and accountability",
    weight: 2,
  },
  {
    id: "GOV-003",
    category: "governance",
    subCategory: "AI Governance Policies",
    questionText: "What model validation and approval processes exist?",
    hint: "Evaluate pre-deployment testing, validation, and sign-off procedures for Artificial Intelligence models",
    weight: 2,
  },
  {
    id: "GOV-004",
    category: "governance",
    subCategory: "AI Governance Policies",
    questionText: "What Artificial Intelligence system documentation requirements exist?",
    hint: "Assess documentation standards for model cards, data sheets, and system architecture",
    weight: 1,
  },

  // --- Decision-Making Structure (4 questions) ---
  {
    id: "GOV-005",
    category: "governance",
    subCategory: "Decision-Making Structure",
    questionText: "Is there an Artificial Intelligence steering committee or governance board?",
    hint: "Evaluate formal decision-making body for Artificial Intelligence strategy and oversight",
    weight: 2,
  },
  {
    id: "GOV-006",
    category: "governance",
    subCategory: "Decision-Making Structure",
    questionText: "What is the decision authority for Artificial Intelligence investments?",
    hint: "Assess budget approval process and investment decision framework for Artificial Intelligence",
    weight: 1,
  },
  {
    id: "GOV-007",
    category: "governance",
    subCategory: "Decision-Making Structure",
    questionText: "How are stakeholders involved in Artificial Intelligence initiatives?",
    hint: "Evaluate stakeholder engagement model for Artificial Intelligence project prioritization",
    weight: 1,
  },
  {
    id: "GOV-008",
    category: "governance",
    subCategory: "Decision-Making Structure",
    questionText: "What escalation paths exist for Artificial Intelligence issues?",
    hint: "Assess issue resolution and escalation procedures for Artificial Intelligence-related problems",
    weight: 1,
  },

  // --- Compliance & Risk (5 questions) ---
  {
    id: "GOV-009",
    category: "governance",
    subCategory: "Compliance & Risk",
    questionText: "What regulatory compliance requirements apply?",
    hint: "Identify industry regulations, standards, and legal requirements for Artificial Intelligence use",
    weight: 2,
  },
  {
    id: "GOV-010",
    category: "governance",
    subCategory: "Compliance & Risk",
    questionText: "What data privacy regulations apply?",
    hint: "Assess GDPR, CCPA, HIPAA, and other privacy requirements affecting Artificial Intelligence",
    weight: 2,
  },
  {
    id: "GOV-011",
    category: "governance",
    subCategory: "Compliance & Risk",
    questionText: "What Artificial Intelligence risk assessment processes exist?",
    hint: "Evaluate risk identification, assessment, and mitigation for Artificial Intelligence systems",
    weight: 2,
  },
  {
    id: "GOV-012",
    category: "governance",
    subCategory: "Compliance & Risk",
    questionText: "What audit and monitoring requirements exist?",
    hint: "Assess ongoing monitoring and periodic audit procedures for Artificial Intelligence systems",
    weight: 1,
  },
  {
    id: "GOV-013",
    category: "governance",
    subCategory: "Compliance & Risk",
    questionText: "What incident response procedures exist for Artificial Intelligence failures?",
    hint: "Evaluate procedures for handling Artificial Intelligence system failures and recovery",
    weight: 1,
  },

  // --- Accountability (4 questions) ---
  {
    id: "GOV-014",
    category: "governance",
    subCategory: "Accountability",
    questionText: "What roles and responsibilities exist for Artificial Intelligence systems?",
    hint: "Assess RACI matrix and accountability framework for Artificial Intelligence operations",
    weight: 2,
  },
  {
    id: "GOV-015",
    category: "governance",
    subCategory: "Accountability",
    questionText: "What model explainability capabilities exist?",
    hint: "Evaluate ability to explain Artificial Intelligence decisions to stakeholders and regulators",
    weight: 1,
  },
  {
    id: "GOV-016",
    category: "governance",
    subCategory: "Accountability",
    questionText: "What performance monitoring and reporting exists?",
    hint: "Assess dashboards, KPIs, and reporting for Artificial Intelligence system performance",
    weight: 2,
  },
  {
    id: "GOV-017",
    category: "governance",
    subCategory: "Accountability",
    questionText: "What bias detection and mitigation procedures exist?",
    hint: "Evaluate fairness testing, bias monitoring, and mitigation strategies",
    weight: 2,
  },

  // --- Transparency (1 question) ---
  {
    id: "GOV-018",
    category: "governance",
    subCategory: "Transparency",
    questionText: "What stakeholder communication mechanisms exist?",
    hint: "Assess transparency in Artificial Intelligence decision-making and stakeholder communication",
    weight: 1,
  },
];
