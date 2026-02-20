import { describe, it, expect, vi } from 'vitest';
import { QueryRespondedHandler } from '@workflow-runtime/application/event-handlers/query-responded-handler.js';
import { WorkExecution } from '@workflow-runtime/domain/index.js';
import type { WorkExecutionRepository } from '@workflow-runtime/domain/index.js';
import { WorkNodeConfigId } from '@workflow-runtime/domain/value-objects/index.js';
import { QueryResponded } from '@common/events/index.js';
import type { WorkflowId } from '@common/ids/index.js';

const WF_ID = 'wf-001' as WorkflowId;
const WE_ID = 'we-001';
const TE_ID = 'te-001';
const WR_ID = 'wr-001';

function createMocks() {
  const workExecutionRepository: WorkExecutionRepository = {
    findById: vi.fn(),
    findByWorkflowRunId: vi.fn(),
    findByWorkflowRunIdOrderedBySequence: vi.fn(),
    save: vi.fn(),
    saveAll: vi.fn(),
    delete: vi.fn(),
    deleteByWorkflowRunId: vi.fn(),
    exists: vi.fn(),
  };
  return { workExecutionRepository };
}

function createWorkExecution(): WorkExecution {
  return WorkExecution.create({
    workflowRunId: WR_ID as never,
    workflowId: WF_ID,
    workNodeConfigId: WorkNodeConfigId.generate(),
    sequence: 0,
    model: 'claude-sonnet',
    taskProps: [{ order: 0, query: 'test query' }],
  });
}

describe('QueryRespondedHandler', () => {
  it('looks up the work execution when query is responded', async () => {
    const mocks = createMocks();
    const we = createWorkExecution();
    vi.mocked(mocks.workExecutionRepository.findById).mockResolvedValue(we);

    const handler = new QueryRespondedHandler(mocks.workExecutionRepository as never);
    const event = new QueryResponded({
      taskExecutionId: TE_ID,
      workExecutionId: we.id,
      workflowRunId: WR_ID,
    });

    await handler.handle(event);

    expect(mocks.workExecutionRepository.findById).toHaveBeenCalledWith(we.id);
  });

  it('handles missing work execution gracefully', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workExecutionRepository.findById).mockResolvedValue(null);

    const handler = new QueryRespondedHandler(mocks.workExecutionRepository as never);
    const event = new QueryResponded({
      taskExecutionId: TE_ID,
      workExecutionId: WE_ID,
      workflowRunId: WR_ID,
    });

    await expect(handler.handle(event)).resolves.toBeUndefined();
  });

  it('does not modify the work execution state', async () => {
    const mocks = createMocks();
    const we = createWorkExecution();
    vi.mocked(mocks.workExecutionRepository.findById).mockResolvedValue(we);

    const handler = new QueryRespondedHandler(mocks.workExecutionRepository as never);
    const event = new QueryResponded({
      taskExecutionId: TE_ID,
      workExecutionId: we.id,
      workflowRunId: WR_ID,
    });

    await handler.handle(event);

    // Handler should not save — it is read-only for cross-cutting concerns
    expect(mocks.workExecutionRepository.save).not.toHaveBeenCalled();
  });
});
