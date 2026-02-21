import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

// ==================== Brand Utility ====================

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

interface IdFactory<T> {
  generate(): T;
  create(value: string): T;
  isValid(value: unknown): value is T;
}

function createIdFactory<T extends Brand<string, string>>(name: string): IdFactory<T> {
  return {
    generate(): T {
      return uuidv4() as T;
    },
    create(value: string): T {
      if (!uuidValidate(value)) {
        throw new Error(`Invalid ${name}: "${value}" is not a valid UUID`);
      }
      return value as T;
    },
    isValid(value: unknown): value is T {
      return typeof value === 'string' && uuidValidate(value);
    },
  };
}

// ==================== Cross-Domain IDs ====================

export type WorkflowId = Brand<string, 'WorkflowId'>;
export const WorkflowId = createIdFactory<WorkflowId>('WorkflowId');

export type GitId = Brand<string, 'GitId'>;
export const GitId = createIdFactory<GitId>('GitId');

export type McpServerId = Brand<string, 'McpServerId'>;
export const McpServerId = createIdFactory<McpServerId>('McpServerId');

export type WorkflowRunId = Brand<string, 'WorkflowRunId'>;
export const WorkflowRunId = createIdFactory<WorkflowRunId>('WorkflowRunId');

export type WorkExecutionId = Brand<string, 'WorkExecutionId'>;
export const WorkExecutionId = createIdFactory<WorkExecutionId>('WorkExecutionId');

export type UserId = Brand<string, 'UserId'>;
export const UserId = createIdFactory<UserId>('UserId');

export type WorkspaceId = Brand<string, 'WorkspaceId'>;
export const WorkspaceId = createIdFactory<WorkspaceId>('WorkspaceId');

// ==================== Re-export Brand Utility ====================

export type { Brand, IdFactory };
export { createIdFactory };
