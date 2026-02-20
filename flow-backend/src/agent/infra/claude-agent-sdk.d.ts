declare module '@anthropic-ai/claude-agent-sdk' {
  export interface McpStdioServerConfig {
    type?: 'stdio';
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }

  export type PermissionMode =
    | 'default'
    | 'acceptEdits'
    | 'bypassPermissions'
    | 'plan'
    | 'delegate'
    | 'dontAsk';

  export interface QueryOptions {
    model?: string;
    cwd?: string;
    allowedTools?: string[];
    permissionMode?: PermissionMode;
    allowDangerouslySkipPermissions?: boolean;
    pathToClaudeCodeExecutable?: string;
    mcpServers?: Record<string, McpStdioServerConfig>;
    maxTurns?: number;
    resume?: string;
    abortController?: AbortController;
  }

  // ─── Content Blocks ───

  export interface SDKTextContentBlock {
    type: 'text';
    text: string;
  }

  export interface SDKToolUseContentBlock {
    type: 'tool_use';
    id: string;
    name: string;
    input: unknown;
  }

  export interface SDKToolResultContentBlock {
    type: 'tool_result';
    tool_use_id: string;
    content: string;
    is_error?: boolean;
  }

  export type SDKContentBlock = SDKTextContentBlock | SDKToolUseContentBlock | SDKToolResultContentBlock;

  // ─── Messages ───

  export interface SDKSystemMessage {
    type: 'system';
    subtype: 'init';
    session_id: string;
    [key: string]: unknown;
  }

  export interface SDKAssistantMessage {
    type: 'assistant';
    message: {
      content: SDKContentBlock[];
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  export interface SDKUserMessage {
    type: 'user';
    message: {
      content: SDKContentBlock[];
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  export interface SDKResultMessage {
    type: 'result';
    duration_ms?: number;
    total_cost_usd?: number;
    num_turns?: number;
    is_error?: boolean;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
    [key: string]: unknown;
  }

  export type SDKMessage =
    | SDKSystemMessage
    | SDKAssistantMessage
    | SDKUserMessage
    | SDKResultMessage
    | { type: string; [key: string]: unknown };

  export interface Query extends AsyncGenerator<SDKMessage, void> {
    close(): void;
  }

  export function query(params: {
    prompt: string;
    options?: QueryOptions;
  }): Query;
}
