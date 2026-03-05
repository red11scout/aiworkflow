import HumanTaskNode from "./HumanTaskNode";
import AITaskNode from "./AITaskNode";
import DecisionGateNode from "./DecisionGateNode";
import DataSourceNode from "./DataSourceNode";
import OutputNode from "./OutputNode";
import HITLCheckpointNode from "./HITLCheckpointNode";

export {
  HumanTaskNode,
  AITaskNode,
  DecisionGateNode,
  DataSourceNode,
  OutputNode,
  HITLCheckpointNode,
};

export { MetricsBar } from "./MetricsBar";
export { NodePropertiesPanel } from "./NodePropertiesPanel";
export { WorkflowCanvas } from "./WorkflowCanvas";
export { FrictionTypeSelector, FRICTION_TYPES } from "./FrictionTypeSelector";
export type { FrictionType } from "./FrictionTypeSelector";
export { EpochVisualizer, EpochBadge } from "./EpochVisualizer";
export { PatternRecommender } from "./PatternRecommender";
export { BeforeAfterTransition } from "./BeforeAfterTransition";

export const nodeTypes = {
  humanTask: HumanTaskNode,
  aiTask: AITaskNode,
  decisionGate: DecisionGateNode,
  dataSource: DataSourceNode,
  output: OutputNode,
  hitlCheckpoint: HITLCheckpointNode,
} as const;
