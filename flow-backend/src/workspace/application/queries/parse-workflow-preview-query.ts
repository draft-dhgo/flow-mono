import { Injectable } from '@nestjs/common';
import { WorkspaceChatHistory } from '../../domain/ports/workspace-chat-history.js';

export interface WorkflowPreview {
  name: string;
  description: string;
  branchStrategy: string;
  gitRefs: { gitId: string; baseBranch: string }[];
  mcpServerRefs: { mcpServerId: string; envOverrides: Record<string, string> }[];
  seedKeys: string[];
  workDefinitions: WorkDefinitionPreview[];
}

export interface WorkDefinitionPreview {
  order: number;
  model: string;
  pauseAfter: boolean;
  reportFileRefs: number[];
  taskDefinitions: TaskDefinitionPreview[];
}

export interface TaskDefinitionPreview {
  order: number;
  query: string;
  reportOutline: { sections: { title: string; description: string }[] } | null;
}

const START_MARKER = 'WORKFLOW_DEFINITION_START';
const END_MARKER = 'WORKFLOW_DEFINITION_END';

@Injectable()
export class ParseWorkflowPreviewQuery {
  constructor(
    private readonly chatHistory: WorkspaceChatHistory,
  ) {}

  execute(workspaceId: string): WorkflowPreview | null {
    const responses = this.chatHistory.getResponses(workspaceId);

    // Scan responses in reverse to find the most recent definition
    for (let i = responses.length - 1; i >= 0; i--) {
      const parsed = this.extractFromText(responses[i]);
      if (parsed) return parsed;
    }

    return null;
  }

  private extractFromText(text: string): WorkflowPreview | null {
    const startIdx = text.lastIndexOf(START_MARKER);
    if (startIdx === -1) return null;

    const endIdx = text.indexOf(END_MARKER, startIdx);
    if (endIdx === -1) return null;

    const jsonStr = text.substring(startIdx + START_MARKER.length, endIdx).trim();

    try {
      const raw = JSON.parse(jsonStr) as Record<string, unknown>;
      return this.validate(raw);
    } catch {
      return null;
    }
  }

  private validate(raw: Record<string, unknown>): WorkflowPreview | null {
    if (typeof raw.name !== 'string' || !raw.name) return null;
    if (!Array.isArray(raw.workDefinitions) || raw.workDefinitions.length === 0) return null;

    return {
      name: raw.name,
      description: typeof raw.description === 'string' ? raw.description : '',
      branchStrategy: typeof raw.branchStrategy === 'string' ? raw.branchStrategy : 'issue-branch',
      gitRefs: Array.isArray(raw.gitRefs)
        ? (raw.gitRefs as { gitId: string; baseBranch: string }[])
        : [],
      mcpServerRefs: Array.isArray(raw.mcpServerRefs)
        ? (raw.mcpServerRefs as { mcpServerId: string; envOverrides: Record<string, string> }[])
        : [],
      seedKeys: Array.isArray(raw.seedKeys)
        ? (raw.seedKeys as string[])
        : [],
      workDefinitions: (raw.workDefinitions as Record<string, unknown>[]).map((wd, idx) => ({
        order: typeof wd.order === 'number' ? wd.order : idx,
        model: typeof wd.model === 'string' ? wd.model : 'claude-sonnet-4-5-20250929',
        pauseAfter: wd.pauseAfter === true,
        reportFileRefs: Array.isArray(wd.reportFileRefs) ? (wd.reportFileRefs as number[]) : [],
        taskDefinitions: Array.isArray(wd.taskDefinitions)
          ? (wd.taskDefinitions as Record<string, unknown>[]).map((td, tdIdx) => ({
              order: typeof td.order === 'number' ? td.order : tdIdx,
              query: typeof td.query === 'string' ? td.query : '',
              reportOutline: td.reportOutline && typeof td.reportOutline === 'object'
                ? (td.reportOutline as { sections: { title: string; description: string }[] })
                : null,
            }))
          : [],
      })),
    };
  }
}
