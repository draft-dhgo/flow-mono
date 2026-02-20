import { AggregateRoot } from '@common/aggregate-root.js';
import { TaskExecution } from './task-execution.js';
import type { CreateTaskExecutionProps } from './task-execution.js';
import { WorkExecutionId, WorkflowRunId, WorkNodeConfigId } from '../value-objects/index.js';
import type { WorkflowId } from '@common/ids/index.js';
import { WorkExecutionStarted, WorkExecutionCompleted } from '@common/events/index.js';
import { RuntimeInvariantViolationError } from '../errors/index.js';

export interface WorkExecutionProps {
  id: WorkExecutionId;
  workflowRunId: WorkflowRunId;
  workflowId: WorkflowId;
  workNodeConfigId: WorkNodeConfigId;
  sequence: number;
  model: string;
  taskExecutions: TaskExecution[];
  currentTaskIndex: number;
  isCompleted: boolean;
  isCancelled: boolean;
  version?: number;
}

export interface CreateWorkExecutionProps {
  workflowRunId: WorkflowRunId;
  workflowId: WorkflowId;
  workNodeConfigId: WorkNodeConfigId;
  sequence: number;
  model: string;
  taskProps: CreateTaskExecutionProps[];
}

export class WorkExecution extends AggregateRoot<WorkExecutionId> {
  private readonly _id: WorkExecutionId;
  private readonly _workflowRunId: WorkflowRunId;
  private readonly _workflowId: WorkflowId;
  private readonly _workNodeConfigId: WorkNodeConfigId;
  private readonly _sequence: number;
  private readonly _model: string;
  private _taskExecutions: TaskExecution[];
  private _currentTaskIndex: number;
  private _isCompleted: boolean;
  private _isCancelled: boolean;

  private constructor(props: WorkExecutionProps) {
    super();
    this._id = props.id;
    this._workflowRunId = props.workflowRunId;
    this._workflowId = props.workflowId;
    this._workNodeConfigId = props.workNodeConfigId;
    this._sequence = props.sequence;
    this._model = props.model;
    this._taskExecutions = [...props.taskExecutions];
    this._currentTaskIndex = props.currentTaskIndex;
    this._isCompleted = props.isCompleted;
    this._isCancelled = props.isCancelled;
    if (props.version !== undefined) this.setVersion(props.version);
  }

  static create(props: CreateWorkExecutionProps): WorkExecution {
    if (!props.taskProps || props.taskProps.length === 0) {
      throw new RuntimeInvariantViolationError('WorkExecution', 'Must have at least one task');
    }
    const id = WorkExecutionId.generate();
    const taskExecutions = props.taskProps.map((tp) => TaskExecution.create(tp));
    const we = new WorkExecution({
      id,
      workflowRunId: props.workflowRunId,
      workflowId: props.workflowId,
      workNodeConfigId: props.workNodeConfigId,
      sequence: props.sequence,
      model: props.model,
      taskExecutions,
      currentTaskIndex: 0,
      isCompleted: false,
      isCancelled: false,
    });

    we.addDomainEvent(new WorkExecutionStarted({
      workExecutionId: id,
      workflowRunId: props.workflowRunId,
      workflowId: props.workflowId,
      sequence: props.sequence,
    }));

    return we;
  }

  static fromProps(props: WorkExecutionProps): WorkExecution {
    if (props.taskExecutions.length === 0) {
      throw new RuntimeInvariantViolationError('WorkExecution', 'Must have at least one task');
    }
    return new WorkExecution(props);
  }

  get id(): WorkExecutionId { return this._id; }
  get workflowRunId(): WorkflowRunId { return this._workflowRunId; }
  get workflowId(): WorkflowId { return this._workflowId; }
  get workNodeConfigId(): WorkNodeConfigId { return this._workNodeConfigId; }
  get sequence(): number { return this._sequence; }
  get model(): string { return this._model; }
  get taskExecutions(): readonly TaskExecution[] { return this._taskExecutions; }
  get currentTaskIndex(): number { return this._currentTaskIndex; }
  get isCompleted(): boolean { return this._isCompleted; }
  get isCancelled(): boolean { return this._isCancelled; }

  currentTask(): TaskExecution | null {
    return this._taskExecutions[this._currentTaskIndex] ?? null;
  }

  advanceToNextTask(): boolean {
    if (this._currentTaskIndex >= this._taskExecutions.length - 1) {
      this._isCompleted = true;
      this.addDomainEvent(new WorkExecutionCompleted({
        workExecutionId: this._id,
        workflowRunId: this._workflowRunId,
        sequence: this._sequence,
      }));
      return false;
    }
    this._currentTaskIndex++;
    return true;
  }

  cancel(): void {
    this._isCancelled = true;
    for (const task of this._taskExecutions) {
      if (!task.isTerminal) task.cancel();
    }
  }

  reset(fromTaskIndex: number = 0): void {
    this._currentTaskIndex = fromTaskIndex;
    this._isCompleted = false;
    this._isCancelled = false;
    for (let i = fromTaskIndex; i < this._taskExecutions.length; i++) {
      this._taskExecutions[i].reset();
    }
  }

  get isTerminal(): boolean {
    return this._isCompleted || this._isCancelled;
  }
}
