import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WorkflowRuntimeFacade } from '@common/ports/index.js';

@Injectable()
export class WorkflowRunToolRegistrar {
  constructor(
    private readonly runtimeFacade: WorkflowRuntimeFacade,
  ) {}

  register(server: McpServer): void {
    server.tool(
      'workflow_run_list',
      'List all workflow runs',
      {},
      async () => {
        const result = await this.runtimeFacade.listRuns();
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    );

    server.tool(
      'workflow_run_summary',
      'Get workflow run count grouped by status',
      {},
      async () => {
        const summary = await this.runtimeFacade.getRunSummary();
        return { content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }] };
      },
    );

    server.tool(
      'workflow_run_get',
      'Get detailed information about a specific workflow run',
      { workflowRunId: z.string().describe('WorkflowRun UUID') },
      async ({ workflowRunId }) => {
        try {
          const run = await this.runtimeFacade.getRunById(workflowRunId);
          if (!run) {
            return { content: [{ type: 'text' as const, text: `WorkflowRun not found: ${workflowRunId}` }], isError: true };
          }
          return { content: [{ type: 'text' as const, text: JSON.stringify(run, null, 2) }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );

    server.tool(
      'workflow_run_start',
      'Start a new workflow run from an ACTIVE workflow',
      {
        workflowId: z.string().describe('Workflow UUID (must be ACTIVE)'),
        issueKey: z.string().describe('Issue key for this run (e.g., PROJ-123)'),
      },
      async ({ workflowId, issueKey }) => {
        try {
          const result = await this.runtimeFacade.startRun({ workflowId, issueKey });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );

    server.tool(
      'workflow_run_pause',
      'Pause a running workflow run',
      { workflowRunId: z.string().describe('WorkflowRun UUID') },
      async ({ workflowRunId }) => {
        try {
          await this.runtimeFacade.pauseRun(workflowRunId);
          return { content: [{ type: 'text' as const, text: `WorkflowRun paused: ${workflowRunId}` }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );

    server.tool(
      'workflow_run_resume',
      'Resume a paused or awaiting workflow run',
      {
        workflowRunId: z.string().describe('WorkflowRun UUID'),
        checkpointId: z.string().optional().describe('Optional checkpoint UUID to restore to'),
      },
      async ({ workflowRunId, checkpointId }) => {
        try {
          await this.runtimeFacade.resumeRun({ workflowRunId, checkpointId });
          return { content: [{ type: 'text' as const, text: `WorkflowRun resumed: ${workflowRunId}` }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );

    server.tool(
      'workflow_run_cancel',
      'Cancel a workflow run',
      {
        workflowRunId: z.string().describe('WorkflowRun UUID'),
        reason: z.string().optional().describe('Cancellation reason'),
      },
      async ({ workflowRunId, reason }) => {
        try {
          await this.runtimeFacade.cancelRun({ workflowRunId, reason });
          return { content: [{ type: 'text' as const, text: `WorkflowRun cancelled: ${workflowRunId}` }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );

    server.tool(
      'workflow_run_delete',
      'Delete a workflow run (must be in terminal state: COMPLETED or CANCELLED)',
      { workflowRunId: z.string().describe('WorkflowRun UUID') },
      async ({ workflowRunId }) => {
        try {
          await this.runtimeFacade.deleteRun(workflowRunId);
          return { content: [{ type: 'text' as const, text: `WorkflowRun deleted: ${workflowRunId}` }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );
  }
}
