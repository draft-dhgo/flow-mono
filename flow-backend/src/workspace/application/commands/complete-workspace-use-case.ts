import { Injectable, Inject } from '@nestjs/common';
import { WorkspaceId } from '@common/ids/index.js';
import { EventPublisher, AgentService } from '@common/ports/index.js';
import { WorkspaceRepository } from '../../domain/ports/workspace-repository.js';
import { WorkspaceEntityNotFoundError } from '../../domain/errors/index.js';

@Injectable()
export class CompleteWorkspaceUseCase {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    @Inject(AgentService) private readonly agentService: AgentService,
    @Inject(EventPublisher) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(id: string): Promise<void> {
    const workspaceId = WorkspaceId.create(id);
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new WorkspaceEntityNotFoundError('Workspace', id);
    }

    workspace.complete();

    // Stop agent session
    if (workspace.agentSessionId) {
      try {
        await this.agentService.stopSessionForWorkspace(workspace.id);
      } catch {
        // ignore
      }
    }

    await this.workspaceRepository.save(workspace);
    await this.eventPublisher.publishAll(workspace.clearDomainEvents());
  }
}
