import type { TaskNodeConfig } from './task-node-config.js';
import type { GitRefNodeConfig } from './git-ref-node-config.js';
import type { McpServerRefNodeConfig } from './mcp-server-ref-node-config.js';
import { WorkNodeConfigId } from './ids.js';
import { RuntimeInvariantViolationError } from '../errors/index.js';

export interface WorkNodeConfigProps {
  readonly id: WorkNodeConfigId;
  readonly sequence: number;
  readonly model: string;
  readonly taskConfigs: readonly TaskNodeConfig[];
  readonly gitRefConfigs: readonly GitRefNodeConfig[];
  readonly mcpServerRefConfigs: readonly McpServerRefNodeConfig[];
  readonly pauseAfter: boolean;
  readonly reportFileRefs: readonly number[];
}

export interface CreateWorkNodeConfigProps {
  readonly sequence: number;
  readonly model: string;
  readonly taskConfigs: TaskNodeConfig[];
  readonly gitRefConfigs?: GitRefNodeConfig[];
  readonly mcpServerRefConfigs?: McpServerRefNodeConfig[];
  readonly pauseAfter?: boolean;
  readonly reportFileRefs?: number[];
}

export class WorkNodeConfig {
  private readonly _id: WorkNodeConfigId;
  private readonly _sequence: number;
  private readonly _model: string;
  private readonly _taskConfigs: readonly TaskNodeConfig[];
  private readonly _gitRefConfigs: readonly GitRefNodeConfig[];
  private readonly _mcpServerRefConfigs: readonly McpServerRefNodeConfig[];
  private readonly _pauseAfter: boolean;
  private readonly _reportFileRefs: readonly number[];

  private constructor(props: WorkNodeConfigProps) {
    this._id = props.id;
    this._sequence = props.sequence;
    this._model = props.model;
    this._taskConfigs = Object.freeze([...props.taskConfigs]);
    this._gitRefConfigs = Object.freeze([...props.gitRefConfigs]);
    this._mcpServerRefConfigs = Object.freeze([...props.mcpServerRefConfigs]);
    this._pauseAfter = props.pauseAfter;
    this._reportFileRefs = Object.freeze([...props.reportFileRefs]);
  }

  static create(props: CreateWorkNodeConfigProps): WorkNodeConfig {
    if (props.sequence < 0) {
      throw new RuntimeInvariantViolationError('WorkNodeConfig', 'Sequence must be >= 0');
    }
    if (!props.model.trim()) {
      throw new RuntimeInvariantViolationError('WorkNodeConfig', 'Model cannot be empty');
    }
    if (props.taskConfigs.length === 0) {
      throw new RuntimeInvariantViolationError('WorkNodeConfig', 'Must have at least one task config');
    }
    return new WorkNodeConfig({
      id: WorkNodeConfigId.generate(),
      sequence: props.sequence,
      model: props.model,
      taskConfigs: props.taskConfigs,
      gitRefConfigs: props.gitRefConfigs ?? [],
      mcpServerRefConfigs: props.mcpServerRefConfigs ?? [],
      pauseAfter: props.pauseAfter ?? false,
      reportFileRefs: props.reportFileRefs ?? [],
    });
  }

  static fromProps(props: WorkNodeConfigProps): WorkNodeConfig {
    if (props.sequence < 0) {
      throw new RuntimeInvariantViolationError('WorkNodeConfig', 'Sequence must be >= 0');
    }
    if (!props.model.trim()) {
      throw new RuntimeInvariantViolationError('WorkNodeConfig', 'Model cannot be empty');
    }
    if (props.taskConfigs.length === 0) {
      throw new RuntimeInvariantViolationError('WorkNodeConfig', 'Must have at least one task config');
    }
    return new WorkNodeConfig(props);
  }

  get id(): WorkNodeConfigId { return this._id; }
  get sequence(): number { return this._sequence; }
  get model(): string { return this._model; }
  get taskConfigs(): readonly TaskNodeConfig[] { return this._taskConfigs; }
  get gitRefConfigs(): readonly GitRefNodeConfig[] { return this._gitRefConfigs; }
  get mcpServerRefConfigs(): readonly McpServerRefNodeConfig[] { return this._mcpServerRefConfigs; }
  get pauseAfter(): boolean { return this._pauseAfter; }
  get reportFileRefs(): readonly number[] { return this._reportFileRefs; }

  withModel(model: string): WorkNodeConfig {
    if (!model.trim()) {
      throw new RuntimeInvariantViolationError('WorkNodeConfig', 'Model cannot be empty');
    }
    return new WorkNodeConfig({ ...this.toProps(), model });
  }

  withTaskConfigs(taskConfigs: TaskNodeConfig[]): WorkNodeConfig {
    if (taskConfigs.length === 0) {
      throw new RuntimeInvariantViolationError('WorkNodeConfig', 'Must have at least one task config');
    }
    return new WorkNodeConfig({ ...this.toProps(), taskConfigs });
  }

  withGitRefConfigs(gitRefConfigs: GitRefNodeConfig[]): WorkNodeConfig {
    return new WorkNodeConfig({ ...this.toProps(), gitRefConfigs });
  }

  withMcpServerRefConfigs(mcpServerRefConfigs: McpServerRefNodeConfig[]): WorkNodeConfig {
    return new WorkNodeConfig({ ...this.toProps(), mcpServerRefConfigs });
  }

  withPauseAfter(pauseAfter: boolean): WorkNodeConfig {
    return new WorkNodeConfig({ ...this.toProps(), pauseAfter });
  }

  withSequence(sequence: number): WorkNodeConfig {
    if (sequence < 0) {
      throw new RuntimeInvariantViolationError('WorkNodeConfig', 'Sequence must be >= 0');
    }
    return new WorkNodeConfig({ ...this.toProps(), sequence });
  }

  withReportFileRefs(reportFileRefs: number[]): WorkNodeConfig {
    return new WorkNodeConfig({ ...this.toProps(), reportFileRefs });
  }

  private toProps(): WorkNodeConfigProps {
    return {
      id: this._id,
      sequence: this._sequence,
      model: this._model,
      taskConfigs: this._taskConfigs,
      gitRefConfigs: this._gitRefConfigs,
      mcpServerRefConfigs: this._mcpServerRefConfigs,
      pauseAfter: this._pauseAfter,
      reportFileRefs: this._reportFileRefs,
    };
  }
}
