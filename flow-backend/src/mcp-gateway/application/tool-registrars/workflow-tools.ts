import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WorkflowFacade } from '@common/ports/index.js';

const gitRefSchema = z.object({
  gitId: z.string(),
  baseBranch: z.string(),
});

const mcpServerRefSchema = z.object({
  mcpServerId: z.string(),
  envOverrides: z.record(z.string(), z.string()).optional(),
});

const reportOutlineSchema = z.object({
  sections: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })),
});

const taskDefinitionSchema = z.object({
  order: z.number(),
  query: z.string(),
  reportOutline: reportOutlineSchema.optional(),
});

const workDefinitionSchema = z.object({
  order: z.number(),
  model: z.string(),
  taskDefinitions: z.array(taskDefinitionSchema),
  gitRefs: z.array(gitRefSchema).optional(),
  mcpServerRefs: z.array(mcpServerRefSchema).optional(),
  pauseAfter: z.boolean().optional(),
});

@Injectable()
export class WorkflowToolRegistrar {
  constructor(
    private readonly workflowFacade: WorkflowFacade,
  ) {}

  register(server: McpServer): void {
    server.tool(
      'workflow_list',
      'List all workflows with status and configuration summary',
      {},
      async () => {
        const result = await this.workflowFacade.list();
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    );

    server.tool(
      'workflow_get',
      'Get detailed information about a specific workflow by ID',
      { workflowId: z.string().describe('Workflow UUID') },
      async ({ workflowId }) => {
        try {
          const workflow = await this.workflowFacade.getById(workflowId);
          if (!workflow) {
            return { content: [{ type: 'text' as const, text: `Workflow not found: ${workflowId}` }], isError: true };
          }
          return { content: [{ type: 'text' as const, text: JSON.stringify(workflow, null, 2) }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );

    server.tool(
      'workflow_create',
      'Create a new workflow with work definitions, git refs, and optional MCP server refs',
      {
        name: z.string().describe('Workflow name'),
        description: z.string().optional().describe('Workflow description'),
        branchStrategy: z.string().describe('Branch strategy pattern'),
        workDefinitions: z.array(workDefinitionSchema).describe('Work definition list'),
        gitRefs: z.array(gitRefSchema).describe('Git repository references'),
        mcpServerRefs: z.array(mcpServerRefSchema).optional().describe('MCP server references'),
      },
      async (args) => {
        try {
          const result = await this.workflowFacade.create({
            name: args.name,
            description: args.description,
            branchStrategy: args.branchStrategy,
            workDefinitions: args.workDefinitions,
            gitRefs: args.gitRefs,
            mcpServerRefs: args.mcpServerRefs,
          });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );

    server.tool(
      'workflow_update',
      'Update an existing workflow (only in DRAFT status)',
      {
        workflowId: z.string().describe('Workflow UUID'),
        name: z.string().optional().describe('New name'),
        description: z.string().optional().describe('New description'),
        workDefinitions: z.array(workDefinitionSchema).optional().describe('Updated work definitions'),
        gitRefs: z.array(gitRefSchema).optional().describe('Updated git refs'),
        mcpServerRefs: z.array(mcpServerRefSchema).optional().describe('Updated MCP server refs'),
      },
      async (args) => {
        try {
          await this.workflowFacade.update({
            workflowId: args.workflowId,
            name: args.name,
            description: args.description,
            workDefinitions: args.workDefinitions,
            gitRefs: args.gitRefs,
            mcpServerRefs: args.mcpServerRefs,
          });
          return { content: [{ type: 'text' as const, text: `Workflow updated: ${args.workflowId}` }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );

    server.tool(
      'workflow_delete',
      'Delete a workflow by ID',
      { workflowId: z.string().describe('Workflow UUID') },
      async ({ workflowId }) => {
        try {
          await this.workflowFacade.delete(workflowId);
          return { content: [{ type: 'text' as const, text: `Workflow deleted: ${workflowId}` }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );

    server.tool(
      'workflow_activate',
      'Activate a workflow (DRAFT -> ACTIVE). Only active workflows can be executed.',
      { workflowId: z.string().describe('Workflow UUID') },
      async ({ workflowId }) => {
        try {
          await this.workflowFacade.activate(workflowId);
          return { content: [{ type: 'text' as const, text: `Workflow activated: ${workflowId}` }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );

    server.tool(
      'workflow_deactivate',
      'Deactivate a workflow (ACTIVE -> DRAFT). Deactivated workflows cannot be executed.',
      { workflowId: z.string().describe('Workflow UUID') },
      async ({ workflowId }) => {
        try {
          await this.workflowFacade.deactivate(workflowId);
          return { content: [{ type: 'text' as const, text: `Workflow deactivated: ${workflowId}` }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );
  }
}
