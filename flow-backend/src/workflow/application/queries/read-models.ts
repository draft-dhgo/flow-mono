import type { WorkflowId } from '@common/ids/index.js';
import type { WorkflowStatus } from '../../domain/value-objects/index.js';

export interface WorkflowGitRefReadModel {
  readonly gitId: string;
  readonly baseBranch: string;
  readonly valid: boolean;
}

export interface WorkflowMcpServerRefReadModel {
  readonly mcpServerId: string;
  readonly envOverrides: Record<string, string> | undefined;
  readonly valid: boolean;
}

export interface WorkflowTaskDefinitionReadModel {
  readonly order: number;
  readonly query: string;
  readonly reportOutline: { sections: { title: string; description: string }[] } | null;
}

export interface WorkflowWorkDefinitionReadModel {
  readonly order: number;
  readonly model: string;
  readonly pauseAfter: boolean;
  readonly reportFileRefs: number[];
  readonly taskDefinitions: WorkflowTaskDefinitionReadModel[];
  readonly gitRefs: WorkflowGitRefReadModel[];
  readonly mcpServerRefs: WorkflowMcpServerRefReadModel[];
}

export interface WorkflowReadModel {
  readonly id: WorkflowId;
  readonly name: string;
  readonly description: string;
  readonly branchStrategy: string;
  readonly status: WorkflowStatus;
  readonly gitRefCount: number;
  readonly mcpServerRefCount: number;
  readonly workDefinitionCount: number;
  readonly seedKeys: string[];
  readonly gitRefs: WorkflowGitRefReadModel[];
  readonly mcpServerRefs: WorkflowMcpServerRefReadModel[];
  readonly workDefinitions: WorkflowWorkDefinitionReadModel[];
}
