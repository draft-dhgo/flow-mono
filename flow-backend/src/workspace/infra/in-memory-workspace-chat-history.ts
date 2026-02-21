import { WorkspaceChatHistory } from '../domain/ports/workspace-chat-history.js';

export class InMemoryWorkspaceChatHistory extends WorkspaceChatHistory {
  private readonly store = new Map<string, string[]>();

  appendResponse(workspaceId: string, response: string): void {
    if (!this.store.has(workspaceId)) {
      this.store.set(workspaceId, []);
    }
    this.store.get(workspaceId)!.push(response);
  }

  getResponses(workspaceId: string): string[] {
    return this.store.get(workspaceId) ?? [];
  }

  clear(workspaceId: string): void {
    this.store.delete(workspaceId);
  }
}
