import { describe, it, expect, vi } from 'vitest';
import { GetAgentSessionQuery } from '@agent/application/queries/get-agent-session-query.js';
import { AgentSession } from '@agent/domain/entities/agent-session.js';
import { AgentSessionId } from '@agent/domain/value-objects/index.js';
import type { AgentSessionRepository } from '@agent/domain/ports/agent-session-repository.js';
import type { WorkExecutionId, WorkflowRunId } from '@common/ids/index.js';
import { ApplicationError } from '@common/errors/index.js';

function createMocks() {
  const agentSessionRepository: AgentSessionRepository = {
    findById: vi.fn(),
    findByWorkExecutionId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };
  return { agentSessionRepository };
}

const WE_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as WorkExecutionId;
const WR_ID = 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee' as WorkflowRunId;
const SESSION_ID = AgentSessionId.generate();

function makeSession(): AgentSession {
  return AgentSession.fromProps({
    id: SESSION_ID,
    workExecutionId: WE_ID,
    workflowRunId: WR_ID,
    model: 'claude-sonnet-4-5-20250929',
    workspacePath: '/tmp/workspace',
    mcpServerConfigs: [],
    processId: 'proc-001',
    sessionId: 'sess-001',
  });
}

describe('GetAgentSessionQuery', () => {
  it('returns agent session read model when found', async () => {
    const mocks = createMocks();
    const session = makeSession();
    vi.mocked(mocks.agentSessionRepository.findByWorkExecutionId).mockResolvedValue(session);

    const query = new GetAgentSessionQuery(mocks.agentSessionRepository);
    const result = await query.execute({ workExecutionId: WE_ID });

    expect(result.id).toBe(SESSION_ID);
    expect(result.workExecutionId).toBe(WE_ID);
    expect(result.workflowRunId).toBe(WR_ID);
    expect(result.model).toBe('claude-sonnet-4-5-20250929');
    expect(result.isAssigned).toBe(true);
    expect(mocks.agentSessionRepository.findByWorkExecutionId).toHaveBeenCalledWith(WE_ID);
  });

  it('throws ApplicationError when session not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.agentSessionRepository.findByWorkExecutionId).mockResolvedValue(null);

    const query = new GetAgentSessionQuery(mocks.agentSessionRepository);

    await expect(query.execute({ workExecutionId: WE_ID })).rejects.toThrow(ApplicationError);
    await expect(query.execute({ workExecutionId: WE_ID })).rejects.toThrow(/not found/i);
  });
});
