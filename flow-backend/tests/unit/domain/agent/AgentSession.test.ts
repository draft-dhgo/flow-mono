import { describe, it, expect } from 'vitest';
import { AgentSession } from '@agent/domain/entities/agent-session.js';
import type { WorkExecutionId, WorkflowRunId } from '@common/ids/index.js';

const WE_ID = 'we-001' as WorkExecutionId;
const WR_ID = 'wr-001' as WorkflowRunId;

function makeValidProps() {
  return {
    workExecutionId: WE_ID,
    workflowRunId: WR_ID,
    model: 'claude-sonnet-4-5-20250929',
    workspacePath: '/workspace/test',
    mcpServerConfigs: [],
  };
}

describe('AgentSession', () => {
  it('creates with correct properties', () => {
    const session = AgentSession.create(makeValidProps());
    expect(session.id).toBeDefined();
    expect(session.workExecutionId).toBe(WE_ID);
    expect(session.workflowRunId).toBe(WR_ID);
    expect(session.model).toBe('claude-sonnet-4-5-20250929');
    expect(session.workspacePath).toBe('/workspace/test');
    expect(session.processId).toBeNull();
    expect(session.sessionId).toBeNull();
    expect(session.isAssigned).toBe(false);
  });

  it('throws on empty model', () => {
    expect(() => AgentSession.create({ ...makeValidProps(), model: '' })).toThrow();
  });

  it('throws on blank model', () => {
    expect(() => AgentSession.create({ ...makeValidProps(), model: '   ' })).toThrow();
  });

  it('throws on empty workspacePath', () => {
    expect(() => AgentSession.create({ ...makeValidProps(), workspacePath: '' })).toThrow();
  });

  it('throws on blank workspacePath', () => {
    expect(() => AgentSession.create({ ...makeValidProps(), workspacePath: '   ' })).toThrow();
  });

  it('assignProcess sets processId', () => {
    const session = AgentSession.create(makeValidProps());
    session.assignProcess('proc-123');
    expect(session.processId).toBe('proc-123');
    // isAssigned requires both sessionId and processId
    expect(session.isAssigned).toBe(false);
  });

  it('assignProcess throws on empty processId', () => {
    const session = AgentSession.create(makeValidProps());
    expect(() => session.assignProcess('')).toThrow();
  });

  it('assignProcess throws on blank processId', () => {
    const session = AgentSession.create(makeValidProps());
    expect(() => session.assignProcess('   ')).toThrow();
  });

  it('assignSession sets both sessionId and processId', () => {
    const session = AgentSession.create(makeValidProps());
    session.assignSession({ sessionId: 'ses-abc', processId: 'proc-123' });
    expect(session.sessionId).toBe('ses-abc');
    expect(session.processId).toBe('proc-123');
    expect(session.isAssigned).toBe(true);
  });

  it('assignSession throws on empty sessionId', () => {
    const session = AgentSession.create(makeValidProps());
    expect(() => session.assignSession({ sessionId: '', processId: 'proc-123' })).toThrow();
  });

  it('assignSession throws on blank sessionId', () => {
    const session = AgentSession.create(makeValidProps());
    expect(() => session.assignSession({ sessionId: '   ', processId: 'proc-123' })).toThrow();
  });

  it('assignSession throws on empty processId', () => {
    const session = AgentSession.create(makeValidProps());
    expect(() => session.assignSession({ sessionId: 'ses-abc', processId: '' })).toThrow();
  });

  it('assignSession throws on blank processId', () => {
    const session = AgentSession.create(makeValidProps());
    expect(() => session.assignSession({ sessionId: 'ses-abc', processId: '   ' })).toThrow();
  });

  it('fromProps restores entity without events', () => {
    const session = AgentSession.create(makeValidProps());
    const restored = AgentSession.fromProps({
      id: session.id,
      workExecutionId: WE_ID,
      workflowRunId: WR_ID,
      model: 'claude-sonnet-4-5-20250929',
      workspacePath: '/workspace/test',
      mcpServerConfigs: [],
      processId: 'proc-123',
      sessionId: 'ses-abc',
      version: 1,
    });
    expect(restored.processId).toBe('proc-123');
    expect(restored.sessionId).toBe('ses-abc');
    expect(restored.isAssigned).toBe(true);
    expect(restored.getDomainEvents()).toHaveLength(0);
  });
});
