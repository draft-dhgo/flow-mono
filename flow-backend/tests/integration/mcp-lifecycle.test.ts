import { describe, it, expect, beforeEach } from 'vitest';
import { RegisterMcpServerUseCase } from '@mcp/application/commands/register-mcp-server-use-case.js';
import { UnregisterMcpServerUseCase } from '@mcp/application/commands/unregister-mcp-server-use-case.js';
import { InMemoryMcpServerRepository } from '@mcp/infra/in-memory-mcp-server-repository.js';
import { InMemoryMcpWorkflowRefStore } from '@mcp/infra/in-memory-mcp-workflow-ref-store.js';
import { InMemoryEventPublisher } from '@common/infra/in-memory-event-publisher.js';
import { McpTransportType } from '@mcp/domain/value-objects/index.js';

describe('MCP Server Lifecycle Integration', () => {
  let mcpServerRepository: InMemoryMcpServerRepository;
  let mcpWorkflowRefStore: InMemoryMcpWorkflowRefStore;
  let eventPublisher: InMemoryEventPublisher;

  beforeEach(() => {
    mcpServerRepository = new InMemoryMcpServerRepository();
    mcpWorkflowRefStore = new InMemoryMcpWorkflowRefStore();
    eventPublisher = new InMemoryEventPublisher();
  });

  it('RegisterMcpServer saves to repository and publishes McpServerRegistered event', async () => {
    const registerUseCase = new RegisterMcpServerUseCase(mcpServerRepository, eventPublisher);

    const result = await registerUseCase.execute({
      name: 'test-server',
      command: 'npx',
      args: ['mcp-server'],
      transportType: McpTransportType.STDIO,
    });

    expect(result.mcpServerId).toBeDefined();
    expect(result.name).toBe('test-server');

    // Verify saved to repository
    const saved = await mcpServerRepository.findById(
      result.mcpServerId as Parameters<typeof mcpServerRepository.findById>[0],
    );
    expect(saved).not.toBeNull();

    // Verify event published
    const events = eventPublisher.getPublishedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('mcp-server.registered');
  });

  it('UnregisterMcpServer removes from repository and publishes McpServerUnregistered event', async () => {
    const registerUseCase = new RegisterMcpServerUseCase(mcpServerRepository, eventPublisher);
    const unregisterUseCase = new UnregisterMcpServerUseCase(mcpServerRepository, mcpWorkflowRefStore, eventPublisher);

    // Register first
    const result = await registerUseCase.execute({
      name: 'test-server',
      command: 'npx',
      transportType: McpTransportType.STDIO,
    });

    eventPublisher.clear();

    // Unregister
    const mcpServerId = result.mcpServerId as Parameters<typeof mcpServerRepository.findById>[0];
    await unregisterUseCase.execute({ mcpServerId });

    // Verify removed from repository
    const found = await mcpServerRepository.findById(mcpServerId);
    expect(found).toBeNull();

    // Verify event published
    const events = eventPublisher.getPublishedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('mcp-server.unregistered');
  });
});
