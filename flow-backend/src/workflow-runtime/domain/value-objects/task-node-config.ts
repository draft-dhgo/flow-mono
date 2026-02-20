import type { ReportOutline } from '@common/value-objects/index.js';
import { RuntimeInvariantViolationError } from '../errors/index.js';

export interface TaskNodeConfigProps {
  readonly order: number;
  readonly query: string;
  readonly reportOutline: ReportOutline | null;
}

export class TaskNodeConfig {
  private readonly _order: number;
  private readonly _query: string;
  private readonly _reportOutline: ReportOutline | null;

  private constructor(order: number, query: string, reportOutline: ReportOutline | null) {
    this._order = order;
    this._query = query;
    this._reportOutline = reportOutline;
  }

  static create(order: number, query: string, reportOutline?: ReportOutline | null): TaskNodeConfig {
    if (order < 0) {
      throw new RuntimeInvariantViolationError('TaskNodeConfig', 'Task order must be >= 0');
    }
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      throw new RuntimeInvariantViolationError('TaskNodeConfig', 'Task query cannot be empty');
    }
    return new TaskNodeConfig(order, trimmedQuery, reportOutline ?? null);
  }

  static fromProps(props: TaskNodeConfigProps): TaskNodeConfig {
    if (props.order < 0) {
      throw new RuntimeInvariantViolationError('TaskNodeConfig', 'Task order must be >= 0');
    }
    if (!props.query.trim()) {
      throw new RuntimeInvariantViolationError('TaskNodeConfig', 'Task query cannot be empty');
    }
    return new TaskNodeConfig(props.order, props.query, props.reportOutline);
  }

  get order(): number { return this._order; }
  get query(): string { return this._query; }
  get reportOutline(): ReportOutline | null { return this._reportOutline; }

  requiresReport(): boolean {
    return this._reportOutline !== null;
  }
}
