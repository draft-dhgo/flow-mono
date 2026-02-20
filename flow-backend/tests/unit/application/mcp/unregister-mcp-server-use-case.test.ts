import { describe, it, expect, vi } from 'vitest';
import { UnregisterMcpServerUseCase, McpServerNotFoundError } from '@mcp/application/commands/unregister-mcp-server-use-case.js';
import { McpServer, McpTransportType } from '@mcp/domain/index.js';
import { McpServerReferencedByWorkflowError } from '@mcp/domain/errors/mcp-server-referenced-by-workflow-error.js';
import type { McpServerRepository, McpWorkflowRefStore } from '@mcp/domain/ports/index.js';
import type { EventPublisher } from '@common/ports/index.js';
import type { McpServerId, WorkflowId } from '@common/ids/index.js';

function createMocks() {
  const mcpServerRepository: McpServerRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByIds: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };
  const mcpWorkflowRefStore: McpWorkflowRefStore = {
    addReference: vi.fn(),
    removeReference: vi.fn(),
    removeAllByWorkflowId: vi.fn(),
    findWorkflowIdsByMcpServerId: vi.fn().mockResolvedValue([]),
  };
  const eventPublisher: EventPublisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  return { mcpServerRepository, mcpWorkflowRefStore, eventPublisher };
}

describe('UnregisterMcpServerUseCase', () => {
  it('unregisters server and publishes events when no workflow references exist', async () => {
    const mocks = createMocks();
    const server = McpServer.create({ name: 'test', command: 'npx', transportType: McpTransportType.STDIO });
    vi.mocked(mocks.mcpServerRepository.findById).mockResolvedValue(server);
    vi.mocked(mocks.mcpWorkflowRefStore.findWorkflowIdsByMcpServerId).mockResolvedValue([]);

    const useCase = new UnregisterMcpServerUseCase(mocks.mcpServerRepository, mocks.mcpWorkflowRefStore, mocks.eventPublisher);
    await useCase.execute({ mcpServerId: server.id });

    expect(mocks.mcpWorkflowRefStore.findWorkflowIdsByMcpServerId).toHaveBeenCalledWith(server.id);
    expect(mocks.mcpServerRepository.delete).toHaveBeenCalledWith(server.id);
    expect(mocks.eventPublisher.publishAll).toHaveBeenCalledOnce();
  });

  it('throws McpServerReferencedByWorkflowError when workflows reference the server', async () => {
    const mocks = createMocks();
    const server = McpServer.create({ name: 'test', command: 'npx', transportType: McpTransportType.STDIO });
    vi.mocked(mocks.mcpServerRepository.findById).mockResolvedValue(server);
    vi.mocked(mocks.mcpWorkflowRefStore.findWorkflowIdsByMcpServerId).mockResolvedValue(['wf-1' as WorkflowId]);

    const useCase = new UnregisterMcpServerUseCase(mocks.mcpServerRepository, mocks.mcpWorkflowRefStore, mocks.eventPublisher);
    await expect(
      useCase.execute({ mcpServerId: server.id }),
    ).rejects.toThrow(McpServerReferencedByWorkflowError);

    expect(mocks.mcpServerRepository.delete).not.toHaveBeenCalled();
  });

  it('throws McpServerNotFoundError when not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.mcpServerRepository.findById).mockResolvedValue(null);

    const useCase = new UnregisterMcpServerUseCase(mocks.mcpServerRepository, mocks.mcpWorkflowRefStore, mocks.eventPublisher);
    await expect(
      useCase.execute({ mcpServerId: 'nonexistent' as McpServerId }),
    ).rejects.toThrow(McpServerNotFoundError);
  });
});
