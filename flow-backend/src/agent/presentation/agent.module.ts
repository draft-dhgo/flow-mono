import { Module } from '@nestjs/common';
import { AgentSessionRepository } from '../domain/ports/agent-session-repository.js';
import { AgentClient } from '../domain/ports/agent-client.js';
import { AgentService } from '@common/ports/index.js';
import { InMemoryAgentSessionRepository } from '../infra/in-memory-agent-session-repository.js';
import { ClaudeAgentClient } from '../infra/claude-agent-client.js';
import { AgentServiceImpl } from '../infra/agent-service-impl.js';
import { AgentLogRepository } from '../application/ports/agent-log-repository.js';
import { InMemoryAgentLogRepository } from '../infra/in-memory-agent-log-repository.js';
import { AgentLogEmitter } from '../application/agent-log-emitter.js';
import { StartAgentSessionUseCase } from '../application/commands/start-agent-session-use-case.js';
import { SendAgentQueryUseCase } from '../application/commands/send-agent-query-use-case.js';
import { StopAgentSessionUseCase } from '../application/commands/stop-agent-session-use-case.js';
import { GetAgentSessionQuery } from '../application/queries/get-agent-session-query.js';
import { ListAgentLogsQuery } from '../application/queries/list-agent-logs-query.js';
import { AgentController } from './agent.controller.js';
import { AgentLogController } from './agent-log.controller.js';
import { SharedModule } from '@common/presentation/shared.module.js';

@Module({
  imports: [SharedModule],
  providers: [
    { provide: AgentSessionRepository, useClass: InMemoryAgentSessionRepository },
    { provide: AgentLogRepository, useClass: InMemoryAgentLogRepository },
    {
      provide: AgentLogEmitter,
      useFactory: (repo: AgentLogRepository) => new AgentLogEmitter(repo),
      inject: [AgentLogRepository],
    },
    {
      provide: AgentClient,
      useFactory: (emitter: AgentLogEmitter) => {
        const client = new ClaudeAgentClient();
        client.setAgentLogEmitter(emitter);
        return client;
      },
      inject: [AgentLogEmitter],
    },
    {
      provide: AgentService,
      useFactory: (client: AgentClient, repo: AgentSessionRepository, emitter: AgentLogEmitter) =>
        new AgentServiceImpl(client, repo, emitter),
      inject: [AgentClient, AgentSessionRepository, AgentLogEmitter],
    },
    StartAgentSessionUseCase,
    SendAgentQueryUseCase,
    StopAgentSessionUseCase,
    GetAgentSessionQuery,
    ListAgentLogsQuery,
  ],
  controllers: [AgentController, AgentLogController],
  exports: [AgentService, AgentSessionRepository, StartAgentSessionUseCase, SendAgentQueryUseCase, StopAgentSessionUseCase],
})
export class AgentModule {}
