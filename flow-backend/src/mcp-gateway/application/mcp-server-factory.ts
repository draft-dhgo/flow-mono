import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GitToolRegistrar } from './tool-registrars/git-tools.js';
import { McpServerToolRegistrar } from './tool-registrars/mcp-server-tools.js';
import { WorkflowToolRegistrar } from './tool-registrars/workflow-tools.js';
import { WorkflowRunToolRegistrar } from './tool-registrars/workflow-run-tools.js';

@Injectable()
export class McpServerFactory {
  constructor(
    private readonly gitRegistrar: GitToolRegistrar,
    private readonly mcpServerRegistrar: McpServerToolRegistrar,
    private readonly workflowRegistrar: WorkflowToolRegistrar,
    private readonly workflowRunRegistrar: WorkflowRunToolRegistrar,
  ) {}

  create(): McpServer {
    const server = new McpServer({
      name: 'flow-backend',
      version: '1.0.0',
    });

    this.gitRegistrar.register(server);
    this.mcpServerRegistrar.register(server);
    this.workflowRegistrar.register(server);
    this.workflowRunRegistrar.register(server);

    return server;
  }
}
