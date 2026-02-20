import type { Workflow } from '../domain/entities/workflow.js';
import type { WorkflowId } from '../domain/value-objects/index.js';
import type { GitId, McpServerId } from '@common/ids/index.js';
import { WorkflowRepository } from '../domain/ports/workflow-repository.js';

export class InMemoryWorkflowRepository extends WorkflowRepository {
  private readonly store = new Map<WorkflowId, Workflow>();

  constructor() {
    super();
  }

  async findById(id: WorkflowId): Promise<Workflow | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<Workflow[]> {
    return [...this.store.values()];
  }

  async findByGitId(gitId: GitId): Promise<Workflow[]> {
    return [...this.store.values()].filter((w) =>
      w.gitRefs.some((ref) => ref.gitId === gitId),
    );
  }

  async findByMcpServerId(mcpServerId: McpServerId): Promise<Workflow[]> {
    return [...this.store.values()].filter((w) =>
      w.mcpServerRefs.some((ref) => ref.mcpServerId === mcpServerId),
    );
  }

  async save(workflow: Workflow): Promise<void> {
    this.store.set(workflow.id, workflow);
  }

  async delete(id: WorkflowId): Promise<void> {
    this.store.delete(id);
  }

  async exists(id: WorkflowId): Promise<boolean> {
    return this.store.has(id);
  }
}
