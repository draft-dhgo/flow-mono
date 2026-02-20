import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GitFacade } from '@common/ports/index.js';

@Injectable()
export class GitToolRegistrar {
  constructor(
    private readonly gitFacade: GitFacade,
  ) {}

  register(server: McpServer): void {
    server.tool(
      'git_list',
      'List all registered git repositories',
      {},
      async () => {
        const result = await this.gitFacade.list();
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      },
    );

    server.tool(
      'git_get',
      'Get git repository details by ID',
      { gitId: z.string().describe('Git repository UUID') },
      async ({ gitId }) => {
        try {
          const git = await this.gitFacade.getById(gitId);
          if (!git) {
            return { content: [{ type: 'text' as const, text: `Git not found: ${gitId}` }], isError: true };
          }
          return { content: [{ type: 'text' as const, text: JSON.stringify(git, null, 2) }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );

    server.tool(
      'git_register',
      'Register a new git repository',
      {
        url: z.string().describe('Git repository URL'),
        localPath: z.string().describe('Local filesystem path for the repository'),
      },
      async ({ url, localPath }) => {
        try {
          const result = await this.gitFacade.register({ url, localPath });
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );

    server.tool(
      'git_delete',
      'Delete a git repository by ID',
      { gitId: z.string().describe('Git repository UUID') },
      async ({ gitId }) => {
        try {
          await this.gitFacade.delete(gitId);
          return { content: [{ type: 'text' as const, text: `Git repository deleted: ${gitId}` }] };
        } catch (e) {
          return { content: [{ type: 'text' as const, text: String(e) }], isError: true };
        }
      },
    );
  }
}
