import { describe, it, expect, vi } from 'vitest';
import { SendAgentQueryUseCase } from '@agent/application/commands/send-agent-query-use-case.js';
import { AgentSessionNotFoundError } from '@agent/application/errors/index.js';
import { AgentSession } from '@agent/domain/entities/agent-session.js';
import type { AgentSessionRepository } from '@agent/domain/ports/agent-session-repository.js';
import type { AgentClient } from '@agent/domain/ports/agent-client.js';
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
    sendQuery: vi.fn().mockResolvedValue({ response: 'answer', tokensUsed: 42 }),
    isRunning: vi.fn(),
  } as unknown as AgentClient;
  return { agentSessionRepository, agentClient };
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

describe('SendAgentQueryUseCase', () => {
  it('sends query and returns result', async () => {
    const mocks = createMocks();
    const session = createAssignedSession();
    vi.mocked(mocks.agentSessionRepository.findByWorkExecutionId).mockResolvedValue(session);

    const useCase = new SendAgentQueryUseCase(
      mocks.agentSessionRepository,
      mocks.agentClient,
    );
    const result = await useCase.execute({ workExecutionId: WE_ID, query: 'test query' });

    expect(result.response).toBe('answer');
    expect(result.tokensUsed).toBe(42);
    expect(mocks.agentClient.sendQuery).toHaveBeenCalledWith('ses-abc', 'test query');
  });

  it('throws AgentSessionNotFoundError when session not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.agentSessionRepository.findByWorkExecutionId).mockResolvedValue(null);

    const useCase = new SendAgentQueryUseCase(
      mocks.agentSessionRepository,
      mocks.agentClient,
    );
    await expect(
      useCase.execute({ workExecutionId: WE_ID, query: 'test' }),
    ).rejects.toThrow(AgentSessionNotFoundError);
  });

  it('throws AgentSessionNotFoundError when sessionId is null', async () => {
    const mocks = createMocks();
    const session = AgentSession.create({
      workExecutionId: WE_ID,
      workflowRunId: WR_ID,
      model: 'claude-sonnet-4-5-20250929',
      workspacePath: '/workspace/test',
      mcpServerConfigs: [],
    });
    // Not assigned — sessionId is null
    vi.mocked(mocks.agentSessionRepository.findByWorkExecutionId).mockResolvedValue(session);

    const useCase = new SendAgentQueryUseCase(
      mocks.agentSessionRepository,
      mocks.agentClient,
    );
    await expect(
      useCase.execute({ workExecutionId: WE_ID, query: 'test' }),
    ).rejects.toThrow(AgentSessionNotFoundError);
  });
});
