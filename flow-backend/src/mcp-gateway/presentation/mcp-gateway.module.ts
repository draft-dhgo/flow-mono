import { Module } from '@nestjs/common';
import { SharedModule } from '@common/presentation/shared.module.js';
import { WorkflowQueryModule } from '@common/presentation/workflow-query.module.js';
import { WorkflowModule } from '@workflow/presentation/workflow.module.js';
import { WorkflowRuntimeModule } from '@workflow-runtime/presentation/workflow-runtime.module.js';
import { GitModule } from '@git/presentation/git.module.js';
import { McpModule } from '@mcp/presentation/mcp.module.js';
import { McpGatewayController } from './mcp-gateway.controller.js';
import { McpServerFactory } from '../application/mcp-server-factory.js';
import { McpSessionManager } from '../application/mcp-session-manager.js';
import { GitToolRegistrar } from '../application/tool-registrars/git-tools.js';
import { McpServerToolRegistrar } from '../application/tool-registrars/mcp-server-tools.js';
import { WorkflowToolRegistrar } from '../application/tool-registrars/workflow-tools.js';
import { WorkflowRunToolRegistrar } from '../application/tool-registrars/workflow-run-tools.js';

@Module({
  imports: [
    SharedModule,
    WorkflowQueryModule,
    WorkflowModule,
    WorkflowRuntimeModule,
    GitModule,
    McpModule,
  ],
  providers: [
    McpSessionManager,
    McpServerFactory,
    GitToolRegistrar,
    McpServerToolRegistrar,
    WorkflowToolRegistrar,
    WorkflowRunToolRegistrar,
  ],
  controllers: [McpGatewayController],
})
export class McpGatewayModule {}
