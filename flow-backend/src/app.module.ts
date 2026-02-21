import { Module, type DynamicModule, type Type } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDatabaseConfig } from './common/infra/typeorm/database.config.js';
import { SharedModule } from './common/presentation/shared.module.js';
import { WorkflowModule } from './workflow/presentation/workflow.module.js';
import { GitModule } from './git/presentation/git.module.js';
import { McpModule } from './mcp/presentation/mcp.module.js';
import { AgentModule } from './agent/presentation/agent.module.js';
import { WorkflowRuntimeModule } from './workflow-runtime/presentation/workflow-runtime.module.js';
import { McpGatewayModule } from './mcp-gateway/presentation/mcp-gateway.module.js';
import { AuthModule } from './auth/presentation/auth.module.js';
import { JwtAuthGuard } from './auth/presentation/guards/jwt-auth.guard.js';

// TypeORM schemas
import { WorkflowSchema } from './workflow/infra/typeorm/workflow.schema.js';
import { GitSchema } from './git/infra/typeorm/git.schema.js';
import { McpServerSchema } from './mcp/infra/typeorm/mcp-server.schema.js';
import { AgentSessionSchema } from './agent/infra/typeorm/agent-session.schema.js';
import { AgentLogSchema } from './agent/infra/typeorm/agent-log.schema.js';
import { WorkflowRunSchema } from './workflow-runtime/infra/typeorm/workflow-run.schema.js';
import { WorkExecutionSchema } from './workflow-runtime/infra/typeorm/work-execution.schema.js';
import { ReportSchema } from './workflow-runtime/infra/typeorm/report.schema.js';
import { CheckpointSchema } from './workflow-runtime/infra/typeorm/checkpoint.schema.js';
import { WorkTreeSchema } from './workflow-runtime/infra/typeorm/work-tree.schema.js';
import { WorkflowSpaceSchema } from './workflow-runtime/infra/typeorm/workflow-space.schema.js';
import { DomainEventSchema } from './common/infra/typeorm/domain-event.schema.js';

// Migration
import { Initial001 } from './common/infra/typeorm/migrations/001-initial.js';
import { DomainEvents002 } from './common/infra/typeorm/migrations/002-domain-events.js';
import { SchemaSync003 } from './common/infra/typeorm/migrations/003-schema-sync.js';

const featureModules = [
  ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  SharedModule,
  AuthModule,
  GitModule,
  McpModule,
  WorkflowModule,
  AgentModule,
  WorkflowRuntimeModule,
  McpGatewayModule,
];

function buildTypeOrmModule(): DynamicModule {
  return TypeOrmModule.forRoot({
    ...createDatabaseConfig(),
    entities: [
      WorkflowSchema,
      GitSchema,
      McpServerSchema,
      AgentSessionSchema,
      AgentLogSchema,
      WorkflowRunSchema,
      WorkExecutionSchema,
      ReportSchema,
      CheckpointSchema,
      WorkTreeSchema,
      WorkflowSpaceSchema,
      DomainEventSchema,
    ],
    migrations: [Initial001, DomainEvents002, SchemaSync003],
  });
}

const imports: Array<Type | DynamicModule> = [...featureModules];

if (process.env.USE_DB !== 'false') {
  imports.unshift(buildTypeOrmModule());
}

@Module({
  imports,
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
