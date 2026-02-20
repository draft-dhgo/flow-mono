import { describe, it, expect, vi } from 'vitest';
import { StopAgentSessionUseCase } from '@agent/application/commands/stop-agent-session-use-case.js';
import { AgentSessionNotFoundError } from '@agent/application/errors/index.js';
import { AgentSession } from '@agent/domain/entities/agent-session.js';
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
    start: vi.fn(),
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

function createAssignedSession(): AgentSession {
  const session = AgentSession.create({
    workExecutionId: WE_ID,
    workflowRunId: WR_ID,
    model: 'claude-sonnet-4-5-20250929',
    workspacePath: '/workspace/test',
    mcpServerConfigs: [],
  });
  session.assignSession({ sessionId: 'ses-abc', processId: 'proc-123' });
  return session;
}

describe('StopAgentSessionUseCase', () => {
  it('stops session and publishes events', async () => {
    const mocks = createMocks();
    const session = createAssignedSession();
    vi.mocked(mocks.agentSessionRepository.findByWorkExecutionId).mockResolvedValue(session);

    const useCase = new StopAgentSessionUseCase(
      mocks.agentSessionRepository,
      mocks.agentClient,
      mocks.eventPublisher,
    );
    await useCase.execute({ workExecutionId: WE_ID });

    expect(mocks.agentClient.stop).toHaveBeenCalledWith('ses-abc');
    expect(mocks.agentSessionRepository.delete).toHaveBeenCalledWith(session.id);
    expect(mocks.eventPublisher.publishAll).toHaveBeenCalledOnce();
  });

  it('throws AgentSessionNotFoundError when session not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.agentSessionRepository.findByWorkExecutionId).mockResolvedValue(null);

    const useCase = new StopAgentSessionUseCase(
      mocks.agentSessionRepository,
      mocks.agentClient,
      mocks.eventPublisher,
    );
    await expect(
      useCase.execute({ workExecutionId: WE_ID }),
    ).rejects.toThrow(AgentSessionNotFoundError);
  });
});
