import type { Workflow } from '../entities/workflow.js';
import type { WorkflowId } from '../value-objects/index.js';
import type { GitId, McpServerId } from '@common/ids/index.js';

export abstract class WorkflowRepository {
  abstract findById(id: WorkflowId): Promise<Workflow | null>;
  abstract findAll(): Promise<Workflow[]>;
  abstract findByGitId(gitId: GitId): Promise<Workflow[]>;
  abstract findByMcpServerId(mcpServerId: McpServerId): Promise<Workflow[]>;
  abstract save(workflow: Workflow): Promise<void>;
  abstract delete(id: WorkflowId): Promise<void>;
  abstract exists(id: WorkflowId): Promise<boolean>;
}
