import { describe, it, expect, vi } from 'vitest';
import { WorkflowRunStartedHandler } from '@workflow-runtime/application/event-handlers/workflow-run-started-handler.js';
import { WorkflowRunStarted } from '@common/events/index.js';
import type { WorkflowPipelineService } from '@common/ports/index.js';

function createMocks() {
  const pipelineService: WorkflowPipelineService = {
    runPipeline: vi.fn().mockResolvedValue(undefined),
  } as unknown as WorkflowPipelineService;
  return { pipelineService };
}

const WORKFLOW_RUN_ID = 'wr-001';

describe('WorkflowRunStartedHandler', () => {
  it('triggers pipeline execution when workflow run starts', async () => {
    const mocks = createMocks();

    const handler = new WorkflowRunStartedHandler(mocks.pipelineService as never);
    const event = new WorkflowRunStarted({ workflowRunId: WORKFLOW_RUN_ID });

    await handler.handle(event);

    expect(mocks.pipelineService.runPipeline).toHaveBeenCalledOnce();
    expect(mocks.pipelineService.runPipeline).toHaveBeenCalledWith(WORKFLOW_RUN_ID);
  });

  it('does not throw when pipeline execution fails', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.pipelineService.runPipeline).mockRejectedValue(
      new Error('pipeline failed'),
    );

    const handler = new WorkflowRunStartedHandler(mocks.pipelineService as never);
    const event = new WorkflowRunStarted({ workflowRunId: WORKFLOW_RUN_ID });

    await expect(handler.handle(event)).resolves.toBeUndefined();
  });

  it('passes the correct workflowRunId from the event payload', async () => {
    const mocks = createMocks();
    const customRunId = 'wr-custom-999';

    const handler = new WorkflowRunStartedHandler(mocks.pipelineService as never);
    const event = new WorkflowRunStarted({ workflowRunId: customRunId });

    await handler.handle(event);

    expect(mocks.pipelineService.runPipeline).toHaveBeenCalledWith(customRunId);
  });
});
