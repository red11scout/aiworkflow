// ============================================================================
// ASSUMPTIONS REFERENCE DATA — shared/assumptions.ts
// Extracted from the BlueAlly Assumptions spreadsheet
// All standardized roles, AI primitives, benefit formulas, weights,
// thresholds, input bounds, default assumptions, friction types, and
// data types used across the aiworkflow pipeline.
// ============================================================================

// ---------------------------------------------------------------------------
// 1. STANDARDIZED ROLES (26 roles)
// ---------------------------------------------------------------------------

export interface StandardizedRole {
  name: string;
  roleId: string;
  category: "operational" | "professional" | "specialized" | "management";
  hourlyRate: number;
  functions: string[];
  description: string;
}

export const STANDARDIZED_ROLES: StandardizedRole[] = [
  // --- Operational ---
  { name: "Administrative Coordinator", roleId: "ROLE_OPS_ADMIN_COORD", category: "operational", hourlyRate: 55, functions: ["Operations", "Human Resources", "Finance"], description: "Handles scheduling, data entry, filing, correspondence, and general office administration" },
  { name: "Customer Service Representative", roleId: "ROLE_OPS_CUST_SVC_REP", category: "operational", hourlyRate: 50, functions: ["Customer Service", "Operations"], description: "Handles inbound inquiries, complaints, order issues, and first-level customer support" },
  { name: "Data Entry Specialist", roleId: "ROLE_OPS_DATA_ENTRY", category: "operational", hourlyRate: 45, functions: ["Operations", "Finance", "Information Technology"], description: "Manual data input, form processing, record maintenance, and data cleanup tasks" },
  { name: "Warehouse Associate", roleId: "ROLE_OPS_WAREHOUSE", category: "operational", hourlyRate: 55, functions: ["Supply Chain", "Logistics", "Operations"], description: "Receiving, picking, packing, shipping, and inventory management in distribution facilities" },
  { name: "Store Associate", roleId: "ROLE_OPS_STORE_ASSOC", category: "operational", hourlyRate: 50, functions: ["Operations", "Customer Service", "Sales"], description: "In-store customer assistance, shelf stocking, register operations, and store maintenance" },
  { name: "Help Desk Technician", roleId: "ROLE_OPS_HELP_DESK", category: "operational", hourlyRate: 60, functions: ["Information Technology", "Operations"], description: "Tier 1 IT support, password resets, hardware/software troubleshooting, ticket management" },
  { name: "Quality Inspector", roleId: "ROLE_OPS_QA_INSPECTOR", category: "operational", hourlyRate: 60, functions: ["Operations", "Supply Chain"], description: "Product/process quality checks, compliance auditing, defect tracking, and inspection documentation" },
  { name: "Inventory Clerk", roleId: "ROLE_OPS_INVENTORY", category: "operational", hourlyRate: 50, functions: ["Operations", "Supply Chain", "Merchandising"], description: "Cycle counts, stock reconciliation, inventory audits, and shrinkage tracking" },

  // --- Professional ---
  { name: "Business Analyst", roleId: "ROLE_PRO_BIZ_ANALYST", category: "professional", hourlyRate: 95, functions: ["Operations", "Finance", "Information Technology", "Product Management"], description: "Requirements gathering, process analysis, data analysis, reporting, and stakeholder communication" },
  { name: "Financial Analyst", roleId: "ROLE_PRO_FIN_ANALYST", category: "professional", hourlyRate: 100, functions: ["Finance"], description: "Budgeting, forecasting, variance analysis, financial modeling, and management reporting" },
  { name: "Marketing Specialist", roleId: "ROLE_PRO_MKTG_SPEC", category: "professional", hourlyRate: 85, functions: ["Marketing", "Digital Commerce"], description: "Campaign execution, content creation, social media management, email marketing, and analytics" },
  { name: "Sales Representative", roleId: "ROLE_PRO_SALES_REP", category: "professional", hourlyRate: 90, functions: ["Sales"], description: "Lead qualification, demos, proposal creation, negotiation, and account management" },
  { name: "HR Specialist", roleId: "ROLE_PRO_HR_SPEC", category: "professional", hourlyRate: 80, functions: ["Human Resources"], description: "Recruiting, onboarding, benefits administration, employee relations, and compliance" },
  { name: "Procurement Specialist", roleId: "ROLE_PRO_PROCUREMENT", category: "professional", hourlyRate: 85, functions: ["Supply Chain", "Operations", "Finance"], description: "Vendor selection, purchase orders, contract negotiation, and supplier relationship management" },
  { name: "Accountant", roleId: "ROLE_PRO_ACCOUNTANT", category: "professional", hourlyRate: 90, functions: ["Finance"], description: "Journal entries, reconciliations, month-end close, financial reporting, and audit support" },
  { name: "Technical Writer", roleId: "ROLE_PRO_TECH_WRITER", category: "professional", hourlyRate: 80, functions: ["Information Technology", "Operations", "Product Management"], description: "Documentation creation, process documentation, knowledge base articles, and training materials" },
  { name: "Customer Support Specialist", roleId: "ROLE_PRO_CUST_SVC_SPEC", category: "professional", hourlyRate: 65, functions: ["Customer Service", "Operations"], description: "Tier 2 escalation handling, complex issue resolution, product expertise, and customer advocacy" },

  // --- Specialized ---
  { name: "Software Developer", roleId: "ROLE_SPEC_SOFTWARE_DEV", category: "specialized", hourlyRate: 125, functions: ["Information Technology", "Digital Commerce"], description: "Application development, API integration, code review, and technical architecture" },
  { name: "Supply Chain Analyst", roleId: "ROLE_SPEC_SC_ANALYST", category: "specialized", hourlyRate: 100, functions: ["Supply Chain", "Logistics", "Operations"], description: "Demand forecasting, inventory optimization, logistics analysis, and S&OP planning" },
  { name: "Merchandising Analyst", roleId: "ROLE_SPEC_MERCH_ANALYST", category: "specialized", hourlyRate: 100, functions: ["Merchandising", "Product Management", "Operations"], description: "Assortment planning, SKU rationalization, pricing analysis, and vendor performance" },
  { name: "Compliance Officer", roleId: "ROLE_SPEC_COMPLIANCE", category: "specialized", hourlyRate: 110, functions: ["Legal & Compliance", "Finance"], description: "Regulatory monitoring, policy enforcement, audit support, and risk assessment" },
  { name: "Project Manager", roleId: "ROLE_SPEC_PROJECT_MGR", category: "specialized", hourlyRate: 115, functions: ["Operations", "Information Technology", "Product Management"], description: "Project planning, resource coordination, timeline management, risk mitigation, and stakeholder reporting" },
  { name: "Data Analyst", roleId: "ROLE_SPEC_DATA_ANALYST", category: "specialized", hourlyRate: 100, functions: ["Information Technology", "Operations", "Finance", "Marketing"], description: "Data extraction, transformation, visualization, statistical analysis, and reporting" },

  // --- Management ---
  { name: "Operations Manager", roleId: "ROLE_MGT_OPS_MGR", category: "management", hourlyRate: 140, functions: ["Operations", "Supply Chain", "Customer Service"], description: "Department P&L ownership, team leadership, process governance, and cross-functional coordination" },
  { name: "Department Director", roleId: "ROLE_MGT_DIRECTOR", category: "management", hourlyRate: 175, functions: ["Operations", "Finance", "Marketing", "Sales", "Human Resources", "Information Technology"], description: "Strategic planning, budget ownership, organizational design, and executive reporting" },
  { name: "Senior Technical Lead", roleId: "ROLE_MGT_TECH_LEAD", category: "management", hourlyRate: 155, functions: ["Information Technology", "Digital Commerce"], description: "Architecture decisions, technical strategy, team mentoring, and system design review" },
];

// ---------------------------------------------------------------------------
// 2. AI PRIMITIVES (6 primitives)
// ---------------------------------------------------------------------------

export interface AIPrimitiveRef {
  name: string;
  description: string;
  examples: string[];
}

export const AI_PRIMITIVES_REF: AIPrimitiveRef[] = [
  { name: "Research & Information Retrieval", description: "Search and surface relevant information from knowledge bases, documents, or external sources", examples: ["Policy lookup", "Knowledge search", "Document discovery", "Regulatory research"] },
  { name: "Content Creation", description: "Create new content, documents, reports, or communications from patterns or prompts", examples: ["Report drafting", "Email composition", "Template completion", "Product descriptions"] },
  { name: "Data Analysis", description: "Analyze, classify, extract patterns from, or predict outcomes based on structured/unstructured data", examples: ["Demand forecasting", "Anomaly detection", "Classification", "Extraction", "Scoring"] },
  { name: "Conversational Interfaces", description: "Natural language interaction for queries, guidance, and task completion", examples: ["Customer support chat", "Internal help desk", "Product finder", "Navigation assistant"] },
  { name: "Workflow Automation", description: "Automate multi-step business processes, routing, approvals, and system integrations", examples: ["Invoice processing", "Approval routing", "Case escalation", "Order processing"] },
  { name: "Coding Assistance", description: "Generate, review, debug, or optimize code and technical implementations", examples: ["Code generation", "Bug detection", "Code review", "Test generation"] },
];

// ---------------------------------------------------------------------------
// 3. BENEFIT FORMULAS (4 formulas)
// ---------------------------------------------------------------------------

export interface BenefitFormulaRef {
  name: string;
  expression: string;
  components: string[];
  description: string;
}

export const BENEFIT_FORMULAS: BenefitFormulaRef[] = [
  { name: "Cost Benefit", expression: "Hours Saved x Loaded Rate x Benefits Loading x Adoption Rate x Data Maturity", components: ["Hours Saved", "Loaded Hourly Rate", "Benefits Loading (1.35)", "Adoption Rate", "Data Maturity Multiplier"], description: "Quantifies labor-cost savings by converting automated hours into dollar value, adjusted for employer overhead, user adoption, and data readiness." },
  { name: "Revenue Benefit", expression: "Revenue Uplift % x Revenue at Risk x Realization Factor x Data Maturity", components: ["Revenue Uplift %", "Baseline Revenue at Risk", "Realization Factor (0.95)", "Data Maturity Multiplier"], description: "Estimates incremental revenue from AI-driven improvements such as conversion rate lifts or cross-sell, tempered by a realization factor and data quality." },
  { name: "Cash Flow Benefit", expression: "Days Improvement x (Annual Revenue / 365) x Cost of Capital x Realization Factor x Data Maturity", components: ["Days Improvement", "Annual Revenue", "Cost of Capital", "Realization Factor (0.85)", "Data Maturity Multiplier"], description: "Values the working-capital release from shortening cash-conversion cycles (e.g., DSO reduction), discounted by the cost of capital." },
  { name: "Risk Benefit", expression: "(Prob Before x Impact Before - Prob After x Impact After) x Realization Factor x Data Maturity", components: ["Probability Before", "Impact Before", "Probability After", "Impact After", "Realization Factor (0.80)", "Data Maturity Multiplier"], description: "Measures the expected-value reduction in risk exposure (probability x impact) between the current and AI-assisted states." },
];

// ---------------------------------------------------------------------------
// 4. READINESS WEIGHTS
// ---------------------------------------------------------------------------

export const READINESS_WEIGHTS = {
  organizationalCapacity: 0.30,
  dataAvailability: 0.30,
  technicalInfrastructure: 0.20,
  governance: 0.20,
} as const;

// ---------------------------------------------------------------------------
// 5. PRIORITY WEIGHTS
// ---------------------------------------------------------------------------

export const PRIORITY_WEIGHTS = {
  readinessScore: 0.50,
  normalizedValue: 0.50,
} as const;

// ---------------------------------------------------------------------------
// 6. TIER THRESHOLDS
// ---------------------------------------------------------------------------

export const TIER_THRESHOLDS = {
  champions: { minPriorityScore: 7.5 },
  quickWins: { maxValue: 5.5, minReadiness: 5.5 },
  strategic: { minValue: 5.5, maxReadiness: 5.5 },
  foundation: { maxPriorityScore: 5.0 },
} as const;

// ---------------------------------------------------------------------------
// 7. INPUT BOUNDS
// ---------------------------------------------------------------------------

export interface InputBound {
  field: string;
  label: string;
  min: number;
  max: number;
}

export const INPUT_BOUNDS: InputBound[] = [
  { field: "hoursSaved", label: "Hours Saved", min: 0, max: 500000 },
  { field: "loadedHourlyRate", label: "Loaded Hourly Rate", min: 25, max: 500 },
  { field: "upliftPct", label: "Revenue Uplift %", min: 0, max: 0.5 },
  { field: "baselineRevenueAtRisk", label: "Baseline Revenue at Risk", min: 0, max: 500000000000 },
  { field: "daysImprovement", label: "Days Improvement", min: 0, max: 365 },
  { field: "annualRevenue", label: "Annual Revenue", min: 0, max: 500000000000 },
  { field: "costOfCapital", label: "Cost of Capital", min: 0.01, max: 0.25 },
  { field: "probBefore", label: "Probability Before", min: 0, max: 1 },
  { field: "impactBefore", label: "Impact Before", min: 0, max: 10000000000 },
  { field: "probAfter", label: "Probability After", min: 0, max: 1 },
  { field: "impactAfter", label: "Impact After", min: 0, max: 10000000000 },
  { field: "runsPerMonth", label: "Runs per Month", min: 0, max: 10000000 },
  { field: "annualHours", label: "Annual Hours", min: 0, max: 500000 },
];

// ---------------------------------------------------------------------------
// 7b. DERIVED CONSTANTS
// ---------------------------------------------------------------------------

// Typical AI automation recovery rate: fraction of friction cost recoverable
// through AI-driven process improvements (conservative industry estimate)
export const FRICTION_RECOVERY_RATE = 0.60;

// ---------------------------------------------------------------------------
// 8. DEFAULT ASSUMPTIONS (29 fields)
// ---------------------------------------------------------------------------

export interface DefaultAssumption {
  category: string;
  fieldName: string;
  displayName: string;
  defaultValue: number | string;
  type: "currency" | "percentage" | "number" | "text";
  unit: string;
  description: string;
  usedInSteps: number[];
}

export const DEFAULT_ASSUMPTIONS: DefaultAssumption[] = [
  // --- Company Financials ---
  { category: "Company Financials", fieldName: "company_name", displayName: "Company Name", defaultValue: "", type: "text", unit: "", description: "Company being analyzed", usedInSteps: [0] },
  { category: "Company Financials", fieldName: "industry", displayName: "Industry / Sector", defaultValue: "", type: "text", unit: "", description: "Primary industry classification (NAICS/SIC)", usedInSteps: [0, 1] },
  { category: "Company Financials", fieldName: "annual_revenue", displayName: "Annual Revenue", defaultValue: 0, type: "currency", unit: "$", description: "Latest fiscal-year total revenue", usedInSteps: [0, 3, 5] },
  { category: "Company Financials", fieldName: "revenue_growth_rate", displayName: "Revenue Growth Rate", defaultValue: 8, type: "percentage", unit: "%", description: "Year-over-year revenue growth", usedInSteps: [1, 5] },
  { category: "Company Financials", fieldName: "gross_margin", displayName: "Gross Margin", defaultValue: 40, type: "percentage", unit: "%", description: "Gross profit / Revenue", usedInSteps: [5] },
  { category: "Company Financials", fieldName: "operating_margin", displayName: "Operating Margin", defaultValue: 15, type: "percentage", unit: "%", description: "Operating income / Revenue", usedInSteps: [5] },
  { category: "Company Financials", fieldName: "net_income", displayName: "Net Income", defaultValue: 0, type: "currency", unit: "$", description: "Annual net income after taxes", usedInSteps: [5] },
  { category: "Company Financials", fieldName: "total_assets", displayName: "Total Assets", defaultValue: 0, type: "currency", unit: "$", description: "Total assets from balance sheet", usedInSteps: [5] },
  { category: "Company Financials", fieldName: "fiscal_year_end", displayName: "Fiscal Year End", defaultValue: "December", type: "text", unit: "", description: "Month when fiscal year ends", usedInSteps: [0] },

  // --- Labor Statistics ---
  { category: "Labor Statistics", fieldName: "total_employees", displayName: "Total Employees", defaultValue: 1000, type: "number", unit: "", description: "Total headcount", usedInSteps: [0, 3, 6] },
  { category: "Labor Statistics", fieldName: "customer_facing_reps", displayName: "Customer-Facing Representatives", defaultValue: 200, type: "number", unit: "", description: "Number of customer-facing staff", usedInSteps: [3, 5] },
  { category: "Labor Statistics", fieldName: "avg_revenue_per_rep", displayName: "Avg Revenue per Representative", defaultValue: 500000, type: "currency", unit: "$", description: "Annual revenue / number of representatives", usedInSteps: [3, 5] },
  { category: "Labor Statistics", fieldName: "avg_salary", displayName: "Average Salary", defaultValue: 65000, type: "currency", unit: "$", description: "Average base compensation per employee", usedInSteps: [3, 5] },
  { category: "Labor Statistics", fieldName: "avg_hourly_wage", displayName: "Average Hourly Wage", defaultValue: 32.07, type: "currency", unit: "$/hr", description: "BLS private-sector average wage", usedInSteps: [3, 5, 6] },
  { category: "Labor Statistics", fieldName: "avg_hourly_benefits", displayName: "Average Hourly Benefits", defaultValue: 13.58, type: "currency", unit: "$/hr", description: "BLS employer benefit costs (29.8% of total comp)", usedInSteps: [3, 5] },
  { category: "Labor Statistics", fieldName: "fully_burdened_rate", displayName: "Fully Burdened Hourly Cost", defaultValue: 45.65, type: "currency", unit: "$/hr", description: "Total employer cost per hour including wages, taxes, benefits, paid leave", usedInSteps: [3, 5, 6] },
  { category: "Labor Statistics", fieldName: "burden_multiplier", displayName: "Burden Multiplier", defaultValue: 1.40, type: "number", unit: "", description: "Total cost / base salary (typically 1.25-1.5x)", usedInSteps: [3, 5] },
  { category: "Labor Statistics", fieldName: "work_hours_year", displayName: "Annual Work Hours", defaultValue: 2080, type: "number", unit: "hrs", description: "Standard annual work hours (40 hrs x 52 weeks)", usedInSteps: [3, 5, 6] },
  { category: "Labor Statistics", fieldName: "it_staff_count", displayName: "IT Staff Count", defaultValue: 50, type: "number", unit: "", description: "Technology and IT department headcount", usedInSteps: [6] },
  { category: "Labor Statistics", fieldName: "sales_staff_count", displayName: "Sales Staff Count", defaultValue: 100, type: "number", unit: "", description: "Sales and business development headcount", usedInSteps: [3, 5] },

  // --- Customer Metrics ---
  { category: "Customer Metrics", fieldName: "cac", displayName: "Customer Acquisition Cost (CAC)", defaultValue: 500, type: "currency", unit: "$", description: "Cost to acquire a new customer", usedInSteps: [3, 5] },
  { category: "Customer Metrics", fieldName: "ltv", displayName: "Customer Lifetime Value (LTV)", defaultValue: 5000, type: "currency", unit: "$", description: "Present value of profits from a customer over the relationship", usedInSteps: [3, 5] },
  { category: "Customer Metrics", fieldName: "ltv_cac_ratio", displayName: "LTV:CAC Ratio", defaultValue: 10, type: "number", unit: "x", description: "Lifetime value divided by acquisition cost", usedInSteps: [1, 5] },
  { category: "Customer Metrics", fieldName: "retention_rate", displayName: "Annual Retention Rate", defaultValue: 85, type: "percentage", unit: "%", description: "Percentage of customers retained annually", usedInSteps: [2, 3, 5] },
  { category: "Customer Metrics", fieldName: "churn_rate", displayName: "Annual Churn Rate", defaultValue: 15, type: "percentage", unit: "%", description: "Percentage of customers lost annually", usedInSteps: [2, 3, 5] },
  { category: "Customer Metrics", fieldName: "arpu", displayName: "Avg Revenue per User (ARPU)", defaultValue: 1200, type: "currency", unit: "$/year", description: "Average annual revenue per customer", usedInSteps: [3, 5] },
  { category: "Customer Metrics", fieldName: "nps_score", displayName: "Net Promoter Score (NPS)", defaultValue: 35, type: "number", unit: "", description: "Customer satisfaction score (-100 to +100)", usedInSteps: [2, 7] },

  // --- Compliance & Risk ---
  { category: "Compliance & Risk", fieldName: "compliance_cost", displayName: "Annual Compliance Cost", defaultValue: 500000, type: "currency", unit: "$", description: "Annual spending on regulatory compliance", usedInSteps: [3, 5] },
  { category: "Compliance & Risk", fieldName: "audit_failure_rate", displayName: "Audit Failure Rate", defaultValue: 5, type: "percentage", unit: "%", description: "Current rate of compliance failures or audit exceptions", usedInSteps: [3, 5] },
];

// ---------------------------------------------------------------------------
// 9. FRICTION TYPES
// ---------------------------------------------------------------------------

export const FRICTION_TYPES = [
  { id: "process", label: "Process Friction", description: "Manual steps, handoffs, redundant workflows" },
  { id: "data", label: "Data Friction", description: "Quality issues, availability gaps, data silos" },
  { id: "technology", label: "Technology Friction", description: "Legacy systems, integration gaps, tool limitations" },
  { id: "knowledge", label: "Knowledge Friction", description: "Expertise gaps, training needs, institutional knowledge loss" },
] as const;

// ---------------------------------------------------------------------------
// 10. DATA TYPES
// ---------------------------------------------------------------------------

export const DATA_TYPES = [
  { id: "structured", label: "Structured", description: "Databases, ERP, CRM, spreadsheets" },
  { id: "semi_structured", label: "Semi-structured", description: "Emails, logs, JSON, XML, chat" },
  { id: "unstructured", label: "Unstructured", description: "Documents, images, video, audio" },
  { id: "real_time", label: "Real-time", description: "Streaming, IoT, sensor data, live feeds" },
] as const;

// ---------------------------------------------------------------------------
// 11. BUSINESS FUNCTIONS (90 function/sub-function mappings)
// ---------------------------------------------------------------------------

export interface BusinessFunctionRef {
  function: string;
  subFunction: string;
  aliases: string[];
}

export const BUSINESS_FUNCTIONS: BusinessFunctionRef[] = [
  { function: "Operations", subFunction: "General Operations", aliases: ["ops", "operations management"] },
  { function: "Operations", subFunction: "Process Management", aliases: ["process ops", "workflow management"] },
  { function: "Operations", subFunction: "Quality Assurance", aliases: ["QA", "quality control"] },
  { function: "Operations", subFunction: "Facilities Management", aliases: ["facilities", "building ops"] },
  { function: "Operations", subFunction: "Document Management", aliases: ["document control", "records management"] },
  { function: "Finance", subFunction: "Accounts Payable", aliases: ["AP", "payables"] },
  { function: "Finance", subFunction: "Accounts Receivable", aliases: ["AR", "receivables"] },
  { function: "Finance", subFunction: "Financial Planning & Analysis", aliases: ["FP&A", "financial planning"] },
  { function: "Finance", subFunction: "Treasury", aliases: ["cash management", "treasury ops"] },
  { function: "Finance", subFunction: "Tax", aliases: ["tax compliance", "tax planning"] },
  { function: "Finance", subFunction: "Audit", aliases: ["internal audit", "external audit"] },
  { function: "Finance", subFunction: "General Accounting", aliases: ["GL", "general ledger"] },
  { function: "Human Resources", subFunction: "Recruiting", aliases: ["talent acquisition", "hiring"] },
  { function: "Human Resources", subFunction: "Onboarding", aliases: ["new hire onboarding", "employee onboarding"] },
  { function: "Human Resources", subFunction: "Benefits Administration", aliases: ["benefits", "compensation & benefits"] },
  { function: "Human Resources", subFunction: "Employee Relations", aliases: ["ER", "labor relations"] },
  { function: "Human Resources", subFunction: "Training & Development", aliases: ["L&D", "learning & development"] },
  { function: "Human Resources", subFunction: "Payroll", aliases: ["payroll processing", "compensation"] },
  { function: "Information Technology", subFunction: "Infrastructure", aliases: ["IT infrastructure", "systems admin"] },
  { function: "Information Technology", subFunction: "Application Development", aliases: ["app dev", "software engineering"] },
  { function: "Information Technology", subFunction: "Cybersecurity", aliases: ["security", "infosec"] },
  { function: "Information Technology", subFunction: "Data Management", aliases: ["data ops", "data engineering"] },
  { function: "Information Technology", subFunction: "IT Support", aliases: ["help desk", "service desk"] },
  { function: "Information Technology", subFunction: "Cloud Operations", aliases: ["cloud ops", "DevOps"] },
  { function: "Marketing", subFunction: "Digital Marketing", aliases: ["digital", "online marketing"] },
  { function: "Marketing", subFunction: "Content Marketing", aliases: ["content", "content strategy"] },
  { function: "Marketing", subFunction: "Brand Marketing", aliases: ["brand", "brand management"] },
  { function: "Marketing", subFunction: "Marketing Analytics", aliases: ["marketing data", "campaign analytics"] },
  { function: "Marketing", subFunction: "Social Media", aliases: ["social", "social media marketing"] },
  { function: "Marketing", subFunction: "Email Marketing", aliases: ["email", "email campaigns"] },
  { function: "Sales", subFunction: "Inside Sales", aliases: ["SDR", "BDR", "inbound sales"] },
  { function: "Sales", subFunction: "Outside Sales", aliases: ["field sales", "enterprise sales"] },
  { function: "Sales", subFunction: "Sales Operations", aliases: ["sales ops", "revenue operations"] },
  { function: "Sales", subFunction: "Account Management", aliases: ["AM", "client management"] },
  { function: "Sales", subFunction: "Sales Engineering", aliases: ["SE", "solutions engineering"] },
  { function: "Customer Service", subFunction: "Contact Center", aliases: ["call center", "customer support center"] },
  { function: "Customer Service", subFunction: "Technical Support", aliases: ["tech support", "product support"] },
  { function: "Customer Service", subFunction: "Customer Success", aliases: ["CS", "client success"] },
  { function: "Customer Service", subFunction: "Returns & Exchanges", aliases: ["returns", "RMA"] },
  { function: "Customer Service", subFunction: "Self-Service", aliases: ["FAQ", "knowledge base", "help center"] },
  { function: "Supply Chain", subFunction: "Procurement", aliases: ["purchasing", "sourcing"] },
  { function: "Supply Chain", subFunction: "Inventory Management", aliases: ["inventory", "stock management"] },
  { function: "Supply Chain", subFunction: "Demand Planning", aliases: ["demand forecasting", "S&OP"] },
  { function: "Supply Chain", subFunction: "Supplier Management", aliases: ["vendor management", "supplier relations"] },
  { function: "Supply Chain", subFunction: "Logistics", aliases: ["shipping", "distribution"] },
  { function: "Supply Chain", subFunction: "Warehouse Operations", aliases: ["warehouse", "fulfillment"] },
  { function: "Legal & Compliance", subFunction: "Contract Management", aliases: ["contracts", "CLM"] },
  { function: "Legal & Compliance", subFunction: "Regulatory Compliance", aliases: ["compliance", "regulatory"] },
  { function: "Legal & Compliance", subFunction: "Risk Management", aliases: ["risk", "ERM"] },
  { function: "Legal & Compliance", subFunction: "Intellectual Property", aliases: ["IP", "patents", "trademarks"] },
  { function: "Legal & Compliance", subFunction: "Privacy & Data Protection", aliases: ["privacy", "GDPR", "data protection"] },
  { function: "Product Management", subFunction: "Product Strategy", aliases: ["product planning", "roadmap"] },
  { function: "Product Management", subFunction: "Product Development", aliases: ["R&D", "product engineering"] },
  { function: "Product Management", subFunction: "Product Analytics", aliases: ["product data", "product metrics"] },
  { function: "Product Management", subFunction: "User Experience", aliases: ["UX", "UI/UX", "design"] },
  { function: "Digital Commerce", subFunction: "E-commerce Operations", aliases: ["ecommerce", "online store"] },
  { function: "Digital Commerce", subFunction: "Marketplace Management", aliases: ["marketplace", "3P selling"] },
  { function: "Digital Commerce", subFunction: "Digital Payments", aliases: ["payments", "payment processing"] },
  { function: "Digital Commerce", subFunction: "Personalization", aliases: ["recommendations", "personalization engine"] },
  { function: "Merchandising", subFunction: "Assortment Planning", aliases: ["assortment", "product selection"] },
  { function: "Merchandising", subFunction: "Pricing", aliases: ["price optimization", "pricing strategy"] },
  { function: "Merchandising", subFunction: "Promotions", aliases: ["promotional planning", "markdowns"] },
  { function: "Merchandising", subFunction: "Category Management", aliases: ["category", "category planning"] },
];

// ---------------------------------------------------------------------------
// 12. HELPER FUNCTIONS
// ---------------------------------------------------------------------------

export function getRoleByRoleId(roleId: string): StandardizedRole | undefined {
  return STANDARDIZED_ROLES.find((r) => r.roleId === roleId);
}

export function getRolesByCategory(category: string): StandardizedRole[] {
  return STANDARDIZED_ROLES.filter((r) => r.category === category);
}

export function getAssumptionsByCategory(category: string): DefaultAssumption[] {
  return DEFAULT_ASSUMPTIONS.filter((a) => a.category === category);
}

export function getAssumptionValue(fieldName: string): number | string {
  const assumption = DEFAULT_ASSUMPTIONS.find((a) => a.fieldName === fieldName);
  return assumption?.defaultValue ?? 0;
}

export function clampInput(field: string, value: number): number {
  const bound = INPUT_BOUNDS.find((b) => b.field === field);
  if (!bound) return value;
  return Math.max(bound.min, Math.min(bound.max, value));
}

export function findBusinessFunction(
  functionName: string,
  subFunctionName?: string,
): BusinessFunctionRef | undefined {
  const lower = functionName.toLowerCase();
  const subLower = subFunctionName?.toLowerCase();

  return BUSINESS_FUNCTIONS.find((bf) => {
    const fnMatch = bf.function.toLowerCase() === lower ||
      bf.aliases.some((a) => a.toLowerCase() === lower);
    if (!subLower) return fnMatch;
    const subMatch = bf.subFunction.toLowerCase() === subLower ||
      bf.aliases.some((a) => a.toLowerCase() === subLower);
    return fnMatch && subMatch;
  });
}
