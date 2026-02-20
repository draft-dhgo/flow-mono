import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync } from 'node:fs';
import { resolveExecutablePath } from '@common/utils/index.js';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type {
  Query, PermissionMode,
  SDKMessage, SDKAssistantMessage, SDKResultMessage, SDKContentBlock,
} from '@anthropic-ai/claude-agent-sdk';
import { AgentClient } from '../domain/ports/agent-client.js';
import type { AgentStartOptions, AgentSessionHandle } from '../domain/ports/agent-client.js';
import type { QueryResult } from '../domain/value-objects/index.js';
import type { McpServerConfig } from '../domain/value-objects/index.js';
import type { AgentLogEmitter } from '../application/agent-log-emitter.js';
import { v4 as uuidv4 } from 'uuid';

const TEXT_TRUNCATE_LEN = 500;

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + '…';
}

function summarizeInput(input: unknown): string {
  const str = typeof input === 'string' ? input : JSON.stringify(input);
  return truncate(str, 200);
}

interface StoredSession {
  sessionId: string;
  processId: string;
  query: Query;
  options: AgentStartOptions;
  workExecutionId?: string;
}

/**
 * [인증 정책] OAuth 전용
 *
 * 이 클라이언트는 로컬에 설치된 `claude` CLI의 OAuth 인증을 사용한다.
 * ANTHROPIC_API_KEY 등 API 키 기반 인증은 절대 사용하지 않는다.
 * `pathToClaudeCodeExecutable`로 OAuth 로그인된 CLI 경로를 명시적으로 지정한다.
 */
@Injectable()
export class ClaudeAgentClient extends AgentClient {
  private readonly logger = new Logger(ClaudeAgentClient.name);
  private readonly sessions = new Map<string, StoredSession>();
  private readonly claudePath: string;
  private agentLogEmitter: AgentLogEmitter | null = null;

  constructor() {
    super();
    this.claudePath = resolveExecutablePath('claude');
  }

  setAgentLogEmitter(emitter: AgentLogEmitter): void {
    this.agentLogEmitter = emitter;
  }

  async start(options: AgentStartOptions): Promise<AgentSessionHandle> {
    const processId = uuidv4();

    this.logger.log(`start() called: model=${options.model}, cwd=${options.workspacePath}, claudePath=${this.claudePath}`);

    const mcpServers = this.convertMcpServerConfigs(options.mcpServerConfigs);

    const session = query({
      prompt: options.systemPrompt ?? 'Initialize workspace.',
      options: {
        model: options.model,
        cwd: options.workspacePath,
        allowedTools: options.allowedTools,
        permissionMode: options.permissionMode as PermissionMode | undefined,
        allowDangerouslySkipPermissions: options.permissionMode === 'bypassPermissions' ? true : undefined,
        pathToClaudeCodeExecutable: this.claudePath,
        mcpServers,
        maxTurns: options.maxTurns,
      },
    });

    let sessionId: string | undefined;
    let msgCount = 0;
    const tempSessionId = uuidv4();

    // Consume all messages from the initial query, extracting the session ID
    // All messages are buffered under tempSessionId to avoid split-buffer issue
    for await (const message of session) {
      msgCount++;
      this.logger.log(`start() msg #${msgCount}: type=${message.type}${message.type === 'system' && 'subtype' in message ? `, subtype=${(message as Record<string, unknown>).subtype}` : ''}`);

      if (!sessionId && message.type === 'system' && 'subtype' in message && message.subtype === 'init') {
        sessionId = (message as { session_id: string }).session_id;
      }
      this.emitLogFromMessage(tempSessionId, message);
    }

    if (!sessionId) {
      sessionId = tempSessionId;
    }

    // Transfer buffered logs from tempSessionId to the real sessionId
    if (sessionId !== tempSessionId && this.agentLogEmitter) {
      this.agentLogEmitter.transferBuffer(tempSessionId, sessionId);
    }

    this.logger.log(`start() completed: sessionId=${sessionId}, tempSessionId=${tempSessionId}, messages=${msgCount}`);
    this.sessions.set(sessionId, { sessionId, processId, query: session, options });

    return { sessionId, processId };
  }

  async stop(sessionId: string): Promise<void> {
    const stored = this.sessions.get(sessionId);
    if (stored) {
      stored.query.close();
      this.sessions.delete(sessionId);
    }
  }

  async sendQuery(sessionId: string, userQuery: string): Promise<QueryResult> {
    const stored = this.sessions.get(sessionId);
    if (!stored) {
      throw new Error(`Session ${sessionId} not found`);
    }

    this.logger.log(`sendQuery() called: sessionId=${sessionId}, query=${userQuery.substring(0, 100)}`);

    // cwd 디렉토리가 삭제되었을 수 있으므로(재시작, cleanup 등) 존재를 보장한다
    const cwd = stored.options.workspacePath;
    if (cwd && !existsSync(cwd)) {
      mkdirSync(cwd, { recursive: true });
    }

    const resumed = query({
      prompt: userQuery,
      options: {
        resume: sessionId,
        pathToClaudeCodeExecutable: this.claudePath,
        cwd: stored.options.workspacePath,
        model: stored.options.model,
        permissionMode: stored.options.permissionMode as PermissionMode | undefined,
        allowDangerouslySkipPermissions: stored.options.permissionMode === 'bypassPermissions' ? true : undefined,
        maxTurns: stored.options.maxTurns,
      },
    });

    let response = '';
    let tokensUsed = 0;
    let msgCount = 0;
    let loggedCount = 0;
    const weId = stored.workExecutionId;

    for await (const message of resumed) {
      msgCount++;
      this.logger.log(`sendQuery() msg #${msgCount}: type=${message.type}`);

      // Emit logs directly if workExecutionId is known
      if (weId && this.agentLogEmitter) {
        this.emitLogDirect(weId, message);
        loggedCount++;
      } else {
        this.emitLogFromMessage(sessionId, message);
        loggedCount++;
      }

      if (message.type === 'assistant' && 'message' in message) {
        const assistantMsg = message as SDKAssistantMessage;
        const content = assistantMsg.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text' && 'text' in block) {
              response += (block as { text: string }).text;
            }
          }
        }
        tokensUsed += 1;
      }
    }

    this.logger.log(`sendQuery() completed: messages=${msgCount}, logged=${loggedCount}, responseLen=${response.length}, weId=${weId}`);
    return { response, tokensUsed };
  }

  setWorkExecutionId(sessionId: string, workExecutionId: string): void {
    const stored = this.sessions.get(sessionId);
    if (stored) {
      stored.workExecutionId = workExecutionId;
    }
  }

  async isRunning(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }

  private emitLogFromMessage(sessionId: string, message: SDKMessage): void {
    if (!this.agentLogEmitter) return;

    if (message.type === 'system' && 'subtype' in message && message.subtype === 'init') {
      this.agentLogEmitter.bufferEntry(sessionId, 'system_init', {
        text: `Session started: ${(message as { session_id: string }).session_id}`,
      });
    } else if (message.type === 'assistant' && 'message' in message) {
      const assistantMsg = message as SDKAssistantMessage;
      this.emitContentBlocks(sessionId, assistantMsg.message.content, false);
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      this.agentLogEmitter.bufferEntry(sessionId, 'result_summary', {
        durationMs: resultMsg.duration_ms,
        totalCostUsd: resultMsg.total_cost_usd,
        numTurns: resultMsg.num_turns,
        usage: resultMsg.usage ? {
          inputTokens: resultMsg.usage.input_tokens,
          outputTokens: resultMsg.usage.output_tokens,
        } : undefined,
      });
    }
  }

  private emitLogDirect(workExecutionId: string, message: SDKMessage): void {
    if (!this.agentLogEmitter) return;

    if (message.type === 'system' && 'subtype' in message) {
      this.agentLogEmitter.emitDirect(workExecutionId, 'system_init', {
        text: `System: ${String((message as Record<string, unknown>).subtype)}`,
      });
    } else if (message.type === 'assistant' && 'message' in message) {
      const assistantMsg = message as SDKAssistantMessage;
      for (const block of assistantMsg.message.content) {
        this.emitDirectBlock(workExecutionId, block);
      }
    } else if (message.type === 'result') {
      const resultMsg = message as SDKResultMessage;
      this.agentLogEmitter.emitDirect(workExecutionId, 'result_summary', {
        durationMs: resultMsg.duration_ms,
        totalCostUsd: resultMsg.total_cost_usd,
        numTurns: resultMsg.num_turns,
        usage: resultMsg.usage ? {
          inputTokens: resultMsg.usage.input_tokens,
          outputTokens: resultMsg.usage.output_tokens,
        } : undefined,
      });
    }
  }

  private emitContentBlocks(sessionId: string, blocks: SDKContentBlock[], _direct: boolean): void {
    if (!this.agentLogEmitter) return;
    for (const block of blocks) {
      if (block.type === 'text') {
        this.agentLogEmitter.bufferEntry(sessionId, 'assistant_text', {
          text: truncate((block as { text: string }).text, TEXT_TRUNCATE_LEN),
        });
      } else if (block.type === 'tool_use') {
        const toolBlock = block as { name: string; input: unknown };
        this.agentLogEmitter.bufferEntry(sessionId, 'tool_use', {
          toolName: toolBlock.name,
          toolInput: summarizeInput(toolBlock.input),
        });
      } else if (block.type === 'tool_result') {
        this.agentLogEmitter.bufferEntry(sessionId, 'tool_result', {
          text: truncate(String((block as { content: string }).content), TEXT_TRUNCATE_LEN),
        });
      }
    }
  }

  private emitDirectBlock(workExecutionId: string, block: SDKContentBlock): void {
    if (!this.agentLogEmitter) return;
    if (block.type === 'text') {
      this.agentLogEmitter.emitDirect(workExecutionId, 'assistant_text', {
        text: truncate((block as { text: string }).text, TEXT_TRUNCATE_LEN),
      });
    } else if (block.type === 'tool_use') {
      const toolBlock = block as { name: string; input: unknown };
      this.agentLogEmitter.emitDirect(workExecutionId, 'tool_use', {
        toolName: toolBlock.name,
        toolInput: summarizeInput(toolBlock.input),
      });
    } else if (block.type === 'tool_result') {
      this.agentLogEmitter.emitDirect(workExecutionId, 'tool_result', {
        text: truncate(String((block as { content: string }).content), TEXT_TRUNCATE_LEN),
      });
    }
  }

  private convertMcpServerConfigs(
    configs: McpServerConfig[],
  ): Record<string, { command: string; args: string[]; env?: Record<string, string> }> {
    const result: Record<string, { command: string; args: string[]; env?: Record<string, string> }> = {};
    for (const config of configs) {
      result[config.name] = {
        command: config.command,
        args: [...config.args],
        env: { ...config.env },
      };
    }
    return result;
  }
}
