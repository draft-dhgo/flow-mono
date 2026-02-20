import { describe, it, expect, vi } from 'vitest';
import { McpServerUnregisteredHandler } from '@workflow/application/event-handlers/mcp-server-unregistered-handler.js';
import { Workflow, WorkDefinition, TaskDefinition, GitRef, McpServerRef, AgentModel } from '@workflow/domain/index.js';
import type { WorkflowRepository } from '@workflow/domain/ports/workflow-repository.js';
import type { EventPublisher } from '@common/ports/index.js';
import { McpServerUnregistered } from '@common/events/index.js';
import type { GitId, McpServerId } from '@common/ids/index.js';

function createMocks() {
  const workflowRepository: WorkflowRepository = {
    findById: vi.fn(),
    findAll: vi.fn(),
    findByGitId: vi.fn(),
    findByMcpServerId: vi.fn().mockResolvedValue([]),
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
  return { workflowRepository, eventPublisher };
}

const GIT_ID = 'git-001' as GitId;
const MCP_ID = 'mcp-001' as McpServerId;

function createWorkflow(): Workflow {
  const task = TaskDefinition.create(0, 'Test task');
  const model = AgentModel.create('claude-sonnet-4-5-20250929');
  const gitRef = GitRef.create(GIT_ID, 'main');
  const mcpRef = McpServerRef.create(MCP_ID);
  const workDef = WorkDefinition.create(0, model, [task], [gitRef], [mcpRef]);
  return Workflow.create({
    name: 'Test',
    branchStrategy: 'feature',
    workDefinitions: [workDef],
    gitRefs: [gitRef],
    mcpServerRefs: [mcpRef],
  });
}

describe('McpServerUnregisteredHandler', () => {
  it('marks mcp ref as invalid on workflows and publishes events', async () => {
    const mocks = createMocks();
    const workflow = createWorkflow();
    vi.mocked(mocks.workflowRepository.findByMcpServerId).mockResolvedValue([workflow]);

    const handler = new McpServerUnregisteredHandler(mocks.workflowRepository, mocks.eventPublisher);
    const event = new McpServerUnregistered({ mcpServerId: MCP_ID });

    await handler.handle(event);

    expect(workflow.mcpServerRefs).toHaveLength(1);
    expect(workflow.mcpServerRefs[0].valid).toBe(false);
    expect(mocks.workflowRepository.save).toHaveBeenCalledOnce();
    expect(mocks.eventPublisher.publishAll).toHaveBeenCalled();
  });

  it('does nothing when no workflows reference the mcp server', async () => {
    const mocks = createMocks();

    const handler = new McpServerUnregisteredHandler(mocks.workflowRepository, mocks.eventPublisher);
    const event = new McpServerUnregistered({ mcpServerId: MCP_ID });

    await handler.handle(event);

    expect(mocks.workflowRepository.save).not.toHaveBeenCalled();
  });
});
