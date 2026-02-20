import type { AgentModel } from './agent-model.js';
import { GitRef } from './git-ref.js';
import { McpServerRef } from './mcp-server-ref.js';
import type { ReportOutline } from './report-outline.js';
import type { GitId, McpServerId } from '@common/ids/index.js';
import { WorkflowInvariantViolationError } from '../errors/index.js';

export class TaskDefinition {
  private readonly _order: number;
  private readonly _query: string;
  private readonly _reportOutline: ReportOutline | null;

  private constructor(order: number, query: string, reportOutline: ReportOutline | null) {
    this._order = order;
    this._query = query;
    this._reportOutline = reportOutline;
  }

  static create(order: number, query: string, reportOutline?: ReportOutline | null): TaskDefinition {
    if (order < 0) {
      throw new WorkflowInvariantViolationError('Task order must be >= 0');
    }
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      throw new WorkflowInvariantViolationError('Task query cannot be empty');
    }
    return new TaskDefinition(order, trimmedQuery, reportOutline ?? null);
  }

  static fromProps(order: number, query: string, reportOutline: ReportOutline | null): TaskDefinition {
    if (order < 0) {
      throw new WorkflowInvariantViolationError('Task order must be >= 0');
    }
    if (!query.trim()) {
      throw new WorkflowInvariantViolationError('Task query cannot be empty');
    }
    return new TaskDefinition(order, query, reportOutline);
  }

  get order(): number {
    return this._order;
  }

  get query(): string {
    return this._query;
  }

  get reportOutline(): ReportOutline | null {
    return this._reportOutline;
  }

  requiresReport(): boolean {
    return this._reportOutline !== null;
  }
}

export class WorkDefinition {
  private readonly _order: number;
  private readonly _model: AgentModel;
  private readonly _gitRefs: readonly GitRef[];
  private readonly _mcpServerRefs: readonly McpServerRef[];
  private readonly _taskDefinitions: readonly TaskDefinition[];
  private readonly _pauseAfter: boolean;

  private constructor(
    order: number,
    model: AgentModel,
    gitRefs: GitRef[],
    mcpServerRefs: McpServerRef[],
    taskDefinitions: TaskDefinition[],
    pauseAfter: boolean
  ) {
    this._order = order;
    this._model = model;
    this._gitRefs = Object.freeze([...gitRefs]);
    this._mcpServerRefs = Object.freeze([...mcpServerRefs]);
    this._taskDefinitions = Object.freeze([...taskDefinitions]);
    this._pauseAfter = pauseAfter;
  }

  static create(
    order: number,
    model: AgentModel,
    taskDefinitions: TaskDefinition[],
    gitRefs?: GitRef[],
    mcpServerRefs?: McpServerRef[],
    pauseAfter: boolean = false
  ): WorkDefinition {
    if (order < 0) {
      throw new WorkflowInvariantViolationError('Work order must be >= 0');
    }
    if (taskDefinitions.length === 0) {
      throw new WorkflowInvariantViolationError('Work must have at least one task definition');
    }
    return new WorkDefinition(order, model, gitRefs ?? [], mcpServerRefs ?? [], taskDefinitions, pauseAfter);
  }

  static fromProps(
    order: number,
    model: AgentModel,
    taskDefinitions: TaskDefinition[],
    gitRefs: GitRef[],
    mcpServerRefs: McpServerRef[],
    pauseAfter: boolean = false
  ): WorkDefinition {
    if (order < 0) {
      throw new WorkflowInvariantViolationError('Work order must be >= 0');
    }
    if (taskDefinitions.length === 0) {
      throw new WorkflowInvariantViolationError('Work must have at least one task definition');
    }
    return new WorkDefinition(order, model, gitRefs, mcpServerRefs, taskDefinitions, pauseAfter);
  }

  get order(): number {
    return this._order;
  }

  get model(): AgentModel {
    return this._model;
  }

  get gitRefs(): readonly GitRef[] {
    return this._gitRefs;
  }

  get mcpServerRefs(): readonly McpServerRef[] {
    return this._mcpServerRefs;
  }

  get taskDefinitions(): readonly TaskDefinition[] {
    return this._taskDefinitions;
  }

  get pauseAfter(): boolean {
    return this._pauseAfter;
  }

  removeGitRef(gitId: GitId): WorkDefinition {
    const filtered = this._gitRefs.filter((ref) => ref.gitId !== gitId);
    return new WorkDefinition(
      this._order, this._model, [...filtered], [...this._mcpServerRefs],
      [...this._taskDefinitions], this._pauseAfter
    );
  }

  removeMcpServerRef(mcpServerId: McpServerId): WorkDefinition {
    const filtered = this._mcpServerRefs.filter((ref) => ref.mcpServerId !== mcpServerId);
    return new WorkDefinition(
      this._order, this._model, [...this._gitRefs], [...filtered],
      [...this._taskDefinitions], this._pauseAfter
    );
  }

  markGitRefInvalid(gitId: GitId): WorkDefinition {
    const updatedGitRefs = this._gitRefs.map((ref) =>
      ref.gitId === gitId ? GitRef.invalidate(ref) : ref
    );
    return new WorkDefinition(
      this._order, this._model, [...updatedGitRefs], [...this._mcpServerRefs],
      [...this._taskDefinitions], this._pauseAfter
    );
  }

  markMcpServerRefInvalid(mcpServerId: McpServerId): WorkDefinition {
    const updatedMcpServerRefs = this._mcpServerRefs.map((ref) =>
      ref.mcpServerId === mcpServerId ? McpServerRef.invalidate(ref) : ref
    );
    return new WorkDefinition(
      this._order, this._model, [...this._gitRefs], [...updatedMcpServerRefs],
      [...this._taskDefinitions], this._pauseAfter
    );
  }
}
