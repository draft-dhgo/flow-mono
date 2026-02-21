import { Injectable, Inject } from '@nestjs/common';
import { WorkspaceId } from '@common/ids/index.js';
import { AgentService } from '@common/ports/index.js';
import { WorkspaceRepository } from '../../domain/ports/workspace-repository.js';
import { WorkspaceChatHistory } from '../../domain/ports/workspace-chat-history.js';
import { WorkspaceEntityNotFoundError } from '../../domain/errors/index.js';
import { WorkspaceInvalidStateTransitionError } from '../../domain/errors/index.js';

export interface SendChatMessageCommand {
  readonly workspaceId: string;
  readonly message: string;
}

@Injectable()
export class SendChatMessageUseCase {
  constructor(
    private readonly workspaceRepository: WorkspaceRepository,
    @Inject(AgentService) private readonly agentService: AgentService,
    private readonly chatHistory: WorkspaceChatHistory,
  ) {}

  async execute(command: SendChatMessageCommand): Promise<{ response: string }> {
    const workspaceId = WorkspaceId.create(command.workspaceId);
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new WorkspaceEntityNotFoundError('Workspace', command.workspaceId);
    }
    if (!workspace.isActive()) {
      throw new WorkspaceInvalidStateTransitionError('Workspace', workspace.status, 'chat');
    }

    const result = await this.agentService.sendQueryForWorkspace(
      workspace.id,
      command.message,
    );

    // Store full response for workflow builder preview parsing
    this.chatHistory.appendResponse(command.workspaceId, result.response);

    return { response: result.response };
  }
}
