import { describe, it, expect, vi } from 'vitest';
import { StartAgentSessionUseCase } from '@agent/application/commands/start-agent-session-use-case.js';
import { AgentSessionCreationError } from '@agent/application/errors/index.js';
import type { AgentSessionRepository } from '@agent/domain/ports/agent-session-repository.js';
import type { AgentClient } from '@agent/domain/ports/agent-client.js';
import type { EventPublisher } from '@common/ports/index.js';
import type { WorkExecutionId, WorkflowRunId } from '@common/ids/index.js';

const WE_ID = 'we-001' as WorkExecutionId;
const WR_ID = 'wr-001' as WorkflowRunId;

function createMocks() {
  const agentSessionRepository = {
    findById: vi.fn(),
    findByWorkExecutionId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  } as unknown as AgentSessionRepository;
  const agentClient = {
    start: vi.fn().mockResolvedValue({ sessionId: 'ses-abc', processId: 'proc-123' }),
    stop: vi.fn(),
    sendQuery: vi.fn(),
    isRunning: vi.fn(),
  } as unknown as AgentClient;
  const eventPublisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  } as unknown as EventPublisher;
  return { agentSessionRepository, agentClient, eventPublisher };
}

describe('StartAgentSessionUseCase', () => {
  it('creates session and publishes events', async () => {
    const mocks = createMocks();
    const useCase = new StartAgentSessionUseCase(
      mocks.agentSessionRepository,
      mocks.agentClient,
      mocks.eventPublisher,
    );

    const result = await useCase.execute({
      workExecutionId: WE_ID,
      workflowRunId: WR_ID,
      model: 'claude-sonnet-4-5-20250929',
      workspacePath: '/workspace/test',
      mcpServerConfigs: [],
    });

    expect(result.agentSessionId).toBeDefined();
    expect(mocks.agentClient.start).toHaveBeenCalledOnce();
    expect(mocks.agentSessionRepository.save).toHaveBeenCalledOnce();
    expect(mocks.eventPublisher.publishAll).toHaveBeenCalledOnce();
  });

  it('throws AgentSessionCreationError when client fails', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.agentClient.start).mockRejectedValue(new Error('connection failed'));

    const useCase = new StartAgentSessionUseCase(
      mocks.agentSessionRepository,
      mocks.agentClient,
      mocks.eventPublisher,
    );

    await expect(useCase.execute({
      workExecutionId: WE_ID,
      workflowRunId: WR_ID,
      model: 'claude-sonnet-4-5-20250929',
      workspacePath: '/workspace/test',
      mcpServerConfigs: [],
    })).rejects.toThrow(AgentSessionCreationError);
  });
});
