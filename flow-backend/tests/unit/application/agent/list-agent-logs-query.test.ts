import { describe, it, expect, vi } from 'vitest';
import { ListAgentLogsQuery } from '@agent/application/queries/list-agent-logs-query.js';
import type { AgentLogRepository } from '@agent/application/ports/agent-log-repository.js';
import type { AgentLogEntry } from '@agent/application/agent-log-entry.js';

function createMocks() {
  const agentLogRepository: AgentLogRepository = {
    save: vi.fn(),
    saveAll: vi.fn(),
    findByWorkExecutionId: vi.fn(),
  };
  return { agentLogRepository };
}

function makeLogEntry(overrides: Partial<AgentLogEntry> = {}): AgentLogEntry {
  return {
    id: 'log-001',
    workExecutionId: 'we-001',
    entryType: 'assistant_text',
    content: { text: 'Hello world' },
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('ListAgentLogsQuery', () => {
  it('returns list of agent log read models', async () => {
    const mocks = createMocks();
    const entries: AgentLogEntry[] = [
      makeLogEntry({ id: 'log-001', entryType: 'system_init', content: { text: 'Init' } }),
      makeLogEntry({ id: 'log-002', entryType: 'assistant_text', content: { text: 'Hello' } }),
    ];
    vi.mocked(mocks.agentLogRepository.findByWorkExecutionId).mockResolvedValue(entries);

    const query = new ListAgentLogsQuery(mocks.agentLogRepository);
    const result = await query.execute({ workExecutionId: 'we-001' });

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('log-001');
    expect(result[0]!.entryType).toBe('system_init');
    expect(result[0]!.content.text).toBe('Init');
    expect(result[0]!.createdAt).toBe('2025-01-01T00:00:00.000Z');
    expect(result[1]!.id).toBe('log-002');
    expect(mocks.agentLogRepository.findByWorkExecutionId).toHaveBeenCalledWith('we-001');
  });

  it('returns empty array when no logs exist', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.agentLogRepository.findByWorkExecutionId).mockResolvedValue([]);

    const query = new ListAgentLogsQuery(mocks.agentLogRepository);
    const result = await query.execute({ workExecutionId: 'we-001' });

    expect(result).toEqual([]);
  });
});
