export abstract class WorkspaceChatHistory {
  abstract appendResponse(workspaceId: string, response: string): void;
  abstract getResponses(workspaceId: string): string[];
  abstract clear(workspaceId: string): void;
}
