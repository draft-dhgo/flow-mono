import { createIdFactory } from '@common/ids/index.js';
import type { Brand } from '@common/ids/index.js';

// Re-export cross-domain IDs from @common
export { WorkflowRunId, WorkExecutionId } from '@common/ids/index.js';

export type TaskExecutionId = Brand<string, 'TaskExecutionId'>;
export const TaskExecutionId = createIdFactory<TaskExecutionId>('TaskExecutionId');

export type ReportId = Brand<string, 'ReportId'>;
export const ReportId = createIdFactory<ReportId>('ReportId');

export type WorkTreeId = Brand<string, 'WorkTreeId'>;
export const WorkTreeId = createIdFactory<WorkTreeId>('WorkTreeId');

export type WorkflowSpaceId = Brand<string, 'WorkflowSpaceId'>;
export const WorkflowSpaceId = createIdFactory<WorkflowSpaceId>('WorkflowSpaceId');

export type WorkSpaceId = Brand<string, 'WorkSpaceId'>;
export const WorkSpaceId = createIdFactory<WorkSpaceId>('WorkSpaceId');

export type CheckpointId = Brand<string, 'CheckpointId'>;
export const CheckpointId = createIdFactory<CheckpointId>('CheckpointId');

export type WorkNodeConfigId = Brand<string, 'WorkNodeConfigId'>;
export const WorkNodeConfigId = createIdFactory<WorkNodeConfigId>('WorkNodeConfigId');
