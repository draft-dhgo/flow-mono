import type { Repository } from 'typeorm';
import { AgentSessionRepository } from '../../domain/ports/agent-session-repository.js';
import { AgentSession } from '../../domain/entities/agent-session.js';
import type { AgentSessionRow } from './agent-session.schema.js';
import { AgentSessionId } from '../../domain/value-objects/index.js';
import type { McpServerConfig } from '../../domain/value-objects/index.js';
import { WorkExecutionId, WorkflowRunId } from '@common/ids/index.js';

export class AgentSessionTypeormRepository extends AgentSessionRepository {
  constructor(private readonly repo: Repository<AgentSessionRow>) {
    super();
  }

  private toDomain(row: AgentSessionRow): AgentSession {
    return AgentSession.fromProps({
      id: AgentSessionId.create(row.id),
      workExecutionId: WorkExecutionId.create(row.work_execution_id),
      workflowRunId: WorkflowRunId.create(row.workflow_run_id),
      model: row.model,
      workspacePath: row.workspace_path,
      mcpServerConfigs: row.mcp_server_configs as McpServerConfig[],
      processId: row.process_id,
      sessionId: row.session_id,
      version: row.version,
    });
  }

  private toRow(entity: AgentSession): AgentSessionRow {
    return {
      id: entity.id as string,
      work_execution_id: entity.workExecutionId as string,
      workflow_run_id: entity.workflowRunId as string,
      model: entity.model,
      workspace_path: entity.workspacePath,
      mcp_server_configs: entity.mcpServerConfigs as unknown,
      process_id: entity.processId,
      session_id: entity.sessionId,
      version: entity.version,
    };
  }

  async findById(id: AgentSessionId): Promise<AgentSession | null> {
    const row = await this.repo.findOneBy({ id: id as string });
    return row ? this.toDomain(row) : null;
  }

  async findByWorkExecutionId(workExecutionId: WorkExecutionId): Promise<AgentSession | null> {
    const row = await this.repo.findOneBy({
      work_execution_id: workExecutionId as string,
    });
    return row ? this.toDomain(row) : null;
  }

  async save(session: AgentSession): Promise<void> {
    const row = this.toRow(session);
    await this.repo.save(row);
  }

  async delete(id: AgentSessionId): Promise<void> {
    await this.repo.delete({ id: id as string });
  }

  async exists(id: AgentSessionId): Promise<boolean> {
    const count = await this.repo.countBy({ id: id as string });
    return count > 0;
  }
}
