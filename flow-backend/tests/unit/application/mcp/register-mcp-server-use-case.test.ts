import { describe, it, expect, vi } from 'vitest';
import { RegisterMcpServerUseCase } from '@mcp/application/commands/register-mcp-server-use-case.js';
import { McpTransportType } from '@mcp/domain/index.js';
import type { McpServerRepository } from '@mcp/domain/ports/index.js';
import type { EventPublisher } from '@common/ports/index.js';

function createMocks() {
  const mcpServerRepository: McpServerRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByIds: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };
  const eventPublisher: EventPublisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  return { mcpServerRepository, eventPublisher };
}

describe('RegisterMcpServerUseCase', () => {
  it('registers server and publishes events', async () => {
    const mocks = createMocks();
    const useCase = new RegisterMcpServerUseCase(mocks.mcpServerRepository, mocks.eventPublisher);

    const result = await useCase.execute({
      name: 'test-server',
      command: 'npx',
      args: ['mcp-server'],
      transportType: McpTransportType.STDIO,
    });

    expect(result.name).toBe('test-server');
    expect(result.transportType).toBe(McpTransportType.STDIO);
    expect(result.mcpServerId).toBeDefined();
    expect(mocks.mcpServerRepository.save).toHaveBeenCalledOnce();
    expect(mocks.eventPublisher.publishAll).toHaveBeenCalledOnce();
  });

  it('throws on empty name', async () => {
    const mocks = createMocks();
    const useCase = new RegisterMcpServerUseCase(mocks.mcpServerRepository, mocks.eventPublisher);

    await expect(
      useCase.execute({ name: '', command: 'npx', transportType: McpTransportType.STDIO }),
    ).rejects.toThrow();
  });

  it('SSE transport requires URL', async () => {
    const mocks = createMocks();
    const useCase = new RegisterMcpServerUseCase(mocks.mcpServerRepository, mocks.eventPublisher);

    await expect(
      useCase.execute({ name: 'test', command: 'npx', transportType: McpTransportType.SSE }),
    ).rejects.toThrow();
  });
});
