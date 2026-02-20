import { describe, it, expect } from 'vitest';
import { McpServer } from '@mcp/domain/entities/mcp-server.js';
import { McpTransportType } from '@mcp/domain/value-objects/index.js';

describe('McpServer', () => {
  it('creates with correct properties', () => {
    const server = McpServer.create({
      name: 'test-server',
      command: 'npx',
      args: ['mcp-server'],
      env: { KEY: 'value' },
      transportType: McpTransportType.STDIO,
    });
    expect(server.name).toBe('test-server');
    expect(server.command).toBe('npx');
    expect(server.transportType).toBe(McpTransportType.STDIO);
  });

  it('emits McpServerRegistered on create', () => {
    const server = McpServer.create({
      name: 'test-server',
      command: 'npx',
      transportType: McpTransportType.STDIO,
    });
    const events = server.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('mcp-server.registered');
  });

  it('unregister works without guard (no activeWorkflowIds)', () => {
    const server = McpServer.create({
      name: 'test-server',
      command: 'npx',
      transportType: McpTransportType.STDIO,
    });
    server.clearDomainEvents();
    server.unregister();
    const events = server.clearDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('mcp-server.unregistered');
  });

  it('throws on empty name', () => {
    expect(() => McpServer.create({
      name: '',
      command: 'npx',
      transportType: McpTransportType.STDIO,
    })).toThrow();
  });

  it('throws on empty command', () => {
    expect(() => McpServer.create({
      name: 'test',
      command: '',
      transportType: McpTransportType.STDIO,
    })).toThrow();
  });

  it('SSE requires URL', () => {
    expect(() => McpServer.create({
      name: 'test',
      command: 'npx',
      transportType: McpTransportType.SSE,
    })).toThrow();
  });

  it('SSE with URL succeeds', () => {
    const server = McpServer.create({
      name: 'test',
      command: 'npx',
      transportType: McpTransportType.SSE,
      url: 'http://localhost:3000',
    });
    expect(server.url).toBe('http://localhost:3000');
  });
});
