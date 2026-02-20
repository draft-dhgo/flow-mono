import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { WorkspacePathFactory } from '@workflow-runtime/application/factories/workspace-path-factory.js';
import type { WorkflowRunId, WorkExecutionId } from '@workflow-runtime/domain/index.js';
import type { GitId } from '@common/ids/index.js';

const RUN_ID = 'run-001' as WorkflowRunId;
const GIT_ID = 'git-001' as GitId;
const WE_ID = 'we-001' as WorkExecutionId;

describe('WorkspacePathFactory', () => {
  it('generates correct WorkflowSpace path', () => {
    const factory = new WorkspacePathFactory('/tmp/spaces');
    expect(factory.workflowSpacePath(RUN_ID)).toBe('/tmp/spaces/run-001');
  });

  it('generates correct WorkTree path', () => {
    const factory = new WorkspacePathFactory('/tmp/spaces');
    expect(factory.workTreePath(RUN_ID, GIT_ID)).toBe('/tmp/spaces/run-001/work-trees/git-001');
  });

  it('generates correct WorkSpace path', () => {
    const factory = new WorkspacePathFactory('/tmp/spaces');
    expect(factory.workSpacePath(RUN_ID, WE_ID)).toBe('/tmp/spaces/run-001/workspaces/we-001');
  });

  it('uses default base path when not specified', () => {
    const factory = new WorkspacePathFactory();
    const expected = join(process.cwd(), 'workflow-spaces', 'run-001');
    expect(factory.workflowSpacePath(RUN_ID)).toBe(expected);
  });
});
