import { AggregateRoot } from '@common/aggregate-root.js';
import { McpServerId } from '../value-objects/index.js';
import { McpTransportType } from '../value-objects/index.js';
import { McpServerRegistered, McpServerUnregistered } from '@common/events/index.js';
import { McpInvariantViolationError } from '../errors/index.js';

export interface McpServerProps {
  id: McpServerId;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  transportType: McpTransportType;
  url: string | null;
  version?: number;
}

export interface CreateMcpServerProps {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  transportType: McpTransportType;
  url?: string | null;
}

export class McpServer extends AggregateRoot<McpServerId> {
  private readonly _id: McpServerId;
  private readonly _name: string;
  private readonly _command: string;
  private readonly _args: readonly string[];
  private readonly _env: Readonly<Record<string, string>>;
  private readonly _transportType: McpTransportType;
  private readonly _url: string | null;

  private constructor(props: McpServerProps) {
    super();
    this._id = props.id;
    this._name = props.name;
    this._command = props.command;
    this._args = Object.freeze([...props.args]);
    this._env = Object.freeze({ ...props.env });
    this._transportType = props.transportType;
    this._url = props.url;
    if (props.version !== undefined) {
      this.setVersion(props.version);
    }
  }

  private static validateUrlRequirement(
    transportType: McpTransportType,
    url: string | null | undefined
  ): void {
    const requiresUrl =
      transportType === McpTransportType.SSE ||
      transportType === McpTransportType.STREAMABLE_HTTP;

    if (requiresUrl && !url) {
      throw new McpInvariantViolationError(
        `Transport type ${transportType} requires a url`
      );
    }

    if (transportType === McpTransportType.STDIO && url) {
      throw new McpInvariantViolationError(
        'STDIO transport type does not use a url'
      );
    }
  }

  /** 허용되는 MCP 서버 커맨드 화이트리스트 */
  private static readonly ALLOWED_COMMANDS = new Set([
    'npx', 'node', 'python', 'python3', 'uvx', 'uv', 'docker', 'deno', 'bun',
  ]);

  private static validateCommand(command: string): void {
    const trimmed = command.trim();
    // path traversal 또는 셸 메타문자 차단
    if (/[;&|`$(){}\\]/.test(trimmed) || trimmed.includes('..')) {
      throw new McpInvariantViolationError(
        `MCP server command contains forbidden characters: "${trimmed}"`,
      );
    }
    // 절대경로가 아닌 경우 화이트리스트 검증
    const basename = trimmed.split('/').pop() ?? trimmed;
    if (!McpServer.ALLOWED_COMMANDS.has(basename)) {
      throw new McpInvariantViolationError(
        `MCP server command is not allowed: "${trimmed}". Allowed: ${[...McpServer.ALLOWED_COMMANDS].join(', ')}`,
      );
    }
  }

  static create(props: CreateMcpServerProps): McpServer {
    if (!props.name.trim()) {
      throw new McpInvariantViolationError('MCP server name cannot be empty');
    }
    if (!props.command.trim()) {
      throw new McpInvariantViolationError('MCP server command cannot be empty');
    }
    McpServer.validateCommand(props.command);
    McpServer.validateUrlRequirement(props.transportType, props.url);

    const id = McpServerId.generate();
    const mcpServer = new McpServer({
      id,
      name: props.name,
      command: props.command,
      args: props.args ?? [],
      env: props.env ?? {},
      transportType: props.transportType,
      url: props.url ?? null,
    });

    mcpServer.addDomainEvent(
      new McpServerRegistered({
        mcpServerId: id,
        name: props.name,
        transportType: props.transportType,
      })
    );

    return mcpServer;
  }

  static fromProps(props: McpServerProps): McpServer {
    if (!props.name.trim()) {
      throw new McpInvariantViolationError('MCP server name cannot be empty');
    }
    if (!props.command.trim()) {
      throw new McpInvariantViolationError('MCP server command cannot be empty');
    }
    McpServer.validateUrlRequirement(props.transportType, props.url);
    return new McpServer(props);
  }

  get id(): McpServerId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get command(): string {
    return this._command;
  }

  get args(): readonly string[] {
    return this._args;
  }

  get env(): Readonly<Record<string, string>> {
    return this._env;
  }

  get transportType(): McpTransportType {
    return this._transportType;
  }

  get url(): string | null {
    return this._url;
  }

  unregister(): void {
    this.addDomainEvent(
      new McpServerUnregistered({
        mcpServerId: this._id,
      })
    );
  }
}
