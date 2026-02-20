import { describe, it, expect } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

describe('queryKeys', () => {
  describe('workflows', () => {
    it('all returns ["workflows"]', () => {
      expect(queryKeys.workflows.all).toEqual(['workflows']);
    });

    it('detail returns ["workflows", id]', () => {
      expect(queryKeys.workflows.detail('abc')).toEqual(['workflows', 'abc']);
    });
  });

  describe('gits', () => {
    it('all returns ["gits"]', () => {
      expect(queryKeys.gits.all).toEqual(['gits']);
    });
  });

  describe('mcpServers', () => {
    it('all returns ["mcp-servers"]', () => {
      expect(queryKeys.mcpServers.all).toEqual(['mcp-servers']);
    });
  });

  describe('workflowRuns', () => {
    it('all returns ["workflow-runs"]', () => {
      expect(queryKeys.workflowRuns.all).toEqual(['workflow-runs']);
    });

    it('detail returns ["workflow-runs", id]', () => {
      expect(queryKeys.workflowRuns.detail('run-1')).toEqual(['workflow-runs', 'run-1']);
    });

    it('summary returns ["workflow-runs", "summary"]', () => {
      expect(queryKeys.workflowRuns.summary).toEqual(['workflow-runs', 'summary']);
    });

    it('checkpoints returns ["workflow-runs", id, "checkpoints"]', () => {
      expect(queryKeys.workflowRuns.checkpoints('run-1')).toEqual([
        'workflow-runs',
        'run-1',
        'checkpoints',
      ]);
    });
  });

  describe('agentSessions', () => {
    it('detail returns ["agent-sessions", workExecutionId]', () => {
      expect(queryKeys.agentSessions.detail('we-1')).toEqual(['agent-sessions', 'we-1']);
    });
  });

  describe('agentLogs', () => {
    it('byWorkExecution returns ["agent-logs", runId, weId]', () => {
      expect(queryKeys.agentLogs.byWorkExecution('run-1', 'we-1')).toEqual([
        'agent-logs',
        'run-1',
        'we-1',
      ]);
    });
  });
});
