import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module.js';
import { CreateWorkflowUseCase } from '@workflow/application/commands/create-workflow-use-case.js';
import { UpdateWorkflowUseCase } from '@workflow/application/commands/update-workflow-use-case.js';
import { DeleteWorkflowUseCase } from '@workflow/application/commands/delete-workflow-use-case.js';
import { CreateGitUseCase } from '@git/application/commands/create-git-use-case.js';
import { DeleteGitUseCase } from '@git/application/commands/delete-git-use-case.js';
import { ForceDeleteGitUseCase } from '@git/application/commands/force-delete-git-use-case.js';
import { ActivateWorkflowUseCase } from '@workflow/application/commands/activate-workflow-use-case.js';
import { RegisterMcpServerUseCase } from '@mcp/application/commands/register-mcp-server-use-case.js';
import { UnregisterMcpServerUseCase } from '@mcp/application/commands/unregister-mcp-server-use-case.js';
import { StartWorkflowRunUseCase } from '@workflow-runtime/application/commands/start-workflow-run-use-case.js';
import { PauseWorkflowRunUseCase } from '@workflow-runtime/application/commands/pause-workflow-run-use-case.js';
import { ResumeWorkflowRunUseCase } from '@workflow-runtime/application/commands/resume-workflow-run-use-case.js';
import { CancelWorkflowRunUseCase } from '@workflow-runtime/application/commands/cancel-workflow-run-use-case.js';
import { WorkflowRepository } from '@workflow/domain/ports/workflow-repository.js';
import { EventPublisher } from '@common/ports/index.js';
import { AgentClient } from '@agent/domain/ports/agent-client.js';
import { GitClient } from '@git/domain/ports/git-client.js';
import { InMemoryGitClient } from '@git/infra/in-memory-git-client.js';
import { AgentService } from '@common/ports/index.js';
import type {
  AgentSessionInfo,
  StartAgentSessionOptions,
  QueryResult,
} from '@common/ports/index.js';
import { WorkflowRunRepository } from '@workflow-runtime/domain/ports/workflow-run-repository.js';
import { WorkExecutionRepository } from '@workflow-runtime/domain/ports/work-execution-repository.js';
import { GitRef, WorkDefinition, TaskDefinition, AgentModel } from '@workflow/domain/value-objects/index.js';
import { McpTransportType } from '@mcp/domain/value-objects/index.js';
import type { WorkflowId } from '@common/ids/index.js';
import type { GitId, McpServerId, WorkExecutionId } from '@common/ids/index.js';
import type { WorkflowRunId } from '@workflow-runtime/domain/value-objects/index.js';

/**
 * Stub AgentClient that does not require Claude SDK.
 */
function createStubAgentClient(): AgentClient {
  return {
    start: async () => ({ sessionId: 'stub-session-id', processId: 'stub-process-id' }),
    stop: async () => {},
    sendQuery: async (_sid: string, query: string) => ({ response: `Stub: ${query}`, tokensUsed: 1 }),
    isRunning: async () => false,
  } as unknown as AgentClient;
}

/**
 * Auto-provisioning AgentService stub.
 * Always returns a valid session for any work execution, allowing the full
 * event-driven chain (WorkExecutionStarted -> SendQuery -> ...) to succeed.
 */
class AutoProvisioningAgentService extends AgentService {
  private readonly sessions = new Map<string, AgentSessionInfo>();

  async startSession(options: StartAgentSessionOptions): Promise<AgentSessionInfo> {
    const info: AgentSessionInfo = {
      sessionId: `session-${options.workExecutionId}`,
      processId: `process-${options.workExecutionId}`,
      isAssigned: true,
    };
    this.sessions.set(options.workExecutionId, info);
    return info;
  }

  async stopSession(workExecutionId: WorkExecutionId): Promise<void> {
    this.sessions.delete(workExecutionId);
  }

  async deleteSession(workExecutionId: WorkExecutionId): Promise<void> {
    this.sessions.delete(workExecutionId);
  }

  async sendQuery(_workExecutionId: WorkExecutionId, query: string): Promise<QueryResult> {
    return { response: `Stub response for: ${query}`, tokensUsed: query.length };
  }

  async findSessionByWorkExecutionId(workExecutionId: WorkExecutionId): Promise<AgentSessionInfo | null> {
    // Auto-provision: always return a valid session
    if (!this.sessions.has(workExecutionId)) {
      const info: AgentSessionInfo = {
        sessionId: `auto-session-${workExecutionId}`,
        processId: `auto-process-${workExecutionId}`,
        isAssigned: true,
      };
      this.sessions.set(workExecutionId, info);
    }
    return this.sessions.get(workExecutionId) ?? null;
  }
}

describe('Integration: NestJS App with InMemory repositories', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AgentClient)
      .useValue(createStubAgentClient())
      .overrideProvider(AgentService)
      .useValue(new AutoProvisioningAgentService())
      .overrideProvider(GitClient)
      .useValue(new InMemoryGitClient())
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Workflow CRUD lifecycle', () => {
    let gitId: GitId;
    let workflowId: WorkflowId;

    it('should create a Git repository first (dependency for workflow)', async () => {
      const createGitUseCase = app.get(CreateGitUseCase);
      const result = await createGitUseCase.execute({
        url: 'https://github.com/test-org/test-repo.git',
        localPath: '/tmp/test-repo',
      });

      expect(result.gitId).toBeDefined();
      expect(result.url).toBe('https://github.com/test-org/test-repo.git');
      gitId = result.gitId as GitId;
    });

    it('should create a workflow', async () => {
      const createWorkflowUseCase = app.get(CreateWorkflowUseCase);

      const taskDef = TaskDefinition.create(0, 'Implement the feature');
      const workDef = WorkDefinition.create(
        0,
        AgentModel.create('claude-sonnet-4-5-20250929'),
        [taskDef],
        [GitRef.create(gitId, 'main')],
      );

      const result = await createWorkflowUseCase.execute({
        name: 'Test Workflow',
        branchStrategy: 'feature/test',
        workDefinitions: [workDef],
        gitRefs: [GitRef.create(gitId, 'main')],
      });

      expect(result.workflowId).toBeDefined();
      expect(result.name).toBe('Test Workflow');
      workflowId = result.workflowId as WorkflowId;
    });

    it('should update a workflow name', async () => {
      const updateWorkflowUseCase = app.get(UpdateWorkflowUseCase);

      await updateWorkflowUseCase.execute({
        workflowId,
        name: 'Updated Workflow Name',
      });

      // Verify the update persisted
      const workflowRepo = app.get(WorkflowRepository);
      const workflow = await workflowRepo.findById(workflowId);
      expect(workflow).not.toBeNull();
      expect(workflow!.name).toBe('Updated Workflow Name');
    });

    it('should delete a workflow', async () => {
      const deleteWorkflowUseCase = app.get(DeleteWorkflowUseCase);

      await deleteWorkflowUseCase.execute({ workflowId });

      // Verify the workflow is gone
      const workflowRepo = app.get(WorkflowRepository);
      const workflow = await workflowRepo.findById(workflowId);
      expect(workflow).toBeNull();
    });
  });

  describe('Git/MCP lifecycle and cascade', () => {
    let gitId: GitId;
    let mcpServerId: McpServerId;
    let workflowId: WorkflowId;

    it('should create a Git repository', async () => {
      const createGitUseCase = app.get(CreateGitUseCase);
      const result = await createGitUseCase.execute({
        url: 'https://github.com/cascade-org/cascade-repo.git',
        localPath: '/tmp/cascade-repo',
      });

      expect(result.gitId).toBeDefined();
      gitId = result.gitId as GitId;
    });

    it('should register an MCP server', async () => {
      const registerMcpUseCase = app.get(RegisterMcpServerUseCase);
      const result = await registerMcpUseCase.execute({
        name: 'test-mcp-server',
        command: 'node',
        args: ['server.js'],
        env: { PORT: '3001' },
        transportType: McpTransportType.STDIO,
      });

      expect(result.mcpServerId).toBeDefined();
      expect(result.name).toBe('test-mcp-server');
      mcpServerId = result.mcpServerId as McpServerId;
    });

    it('should create a workflow referencing Git and MCP', async () => {
      const createWorkflowUseCase = app.get(CreateWorkflowUseCase);

      const taskDef = TaskDefinition.create(0, 'Build the feature');
      const workDef = WorkDefinition.create(
        0,
        AgentModel.create('claude-sonnet-4-5-20250929'),
        [taskDef],
        [GitRef.create(gitId, 'main')],
      );

      const result = await createWorkflowUseCase.execute({
        name: 'Cascade Workflow',
        branchStrategy: 'feature/cascade',
        workDefinitions: [workDef],
        gitRefs: [GitRef.create(gitId, 'main')],
      });

      workflowId = result.workflowId as WorkflowId;
      expect(result.workflowId).toBeDefined();
    });

    it('should reject Git deletion when referenced by workflow', async () => {
      const deleteGitUseCase = app.get(DeleteGitUseCase);

      await expect(
        deleteGitUseCase.execute({ gitId }),
      ).rejects.toThrow();
    });

    it('should force-delete Git and cascade marks gitRef as invalid on workflow', async () => {
      const forceDeleteGitUseCase = app.get(ForceDeleteGitUseCase);

      await forceDeleteGitUseCase.execute({ gitId });

      // Verify cascade: workflow gitRef should be marked invalid
      const workflowRepo = app.get(WorkflowRepository);
      const workflow = await workflowRepo.findById(workflowId);
      expect(workflow).not.toBeNull();
      expect(workflow!.gitRefs).toHaveLength(1);
      expect(workflow!.gitRefs[0].valid).toBe(false);
    });

    it('should unregister MCP server', async () => {
      const unregisterMcpUseCase = app.get(UnregisterMcpServerUseCase);

      await unregisterMcpUseCase.execute({ mcpServerId });

      // Verify deletion by trying to unregister again (should throw not found)
      await expect(
        unregisterMcpUseCase.execute({ mcpServerId }),
      ).rejects.toThrow();
    });

    it('should verify events were published', () => {
      const eventPublisher = app.get<EventPublisher & { getPublishedEvents(): unknown[] }>(EventPublisher);
      const events = eventPublisher.getPublishedEvents();

      const eventTypes = events.map((e: { eventType: string }) => e.eventType);
      expect(eventTypes).toContain('git.created');
      expect(eventTypes).toContain('mcp-server.registered');
      expect(eventTypes).toContain('workflow.created');
      expect(eventTypes).toContain('git.deleted');
      expect(eventTypes).toContain('workflow.updated'); // from markGitRefInvalid cascade
      expect(eventTypes).toContain('mcp-server.unregistered');
    });
  });

  describe('Workflow run lifecycle (direct use-case invocation)', () => {
    /**
     * The workflow run lifecycle tests bypass the synchronous event chain
     * by directly creating domain objects and saving them to repositories.
     * This verifies the NestJS DI wiring for all workflow run use cases
     * (start, pause, resume, cancel) in isolation.
     */
    let workflowRunId: WorkflowRunId;

    it('should start a workflow run and verify it was created', async () => {
      // First, create a git repo + workflow
      const createGitUseCase = app.get(CreateGitUseCase);
      const gitResult = await createGitUseCase.execute({
        url: 'https://github.com/run-org/run-repo.git',
        localPath: '/tmp/run-repo',
      });
      const gitId = gitResult.gitId as GitId;

      const createWorkflowUseCase = app.get(CreateWorkflowUseCase);
      const taskDef = TaskDefinition.create(0, 'Execute the task');
      const workDef = WorkDefinition.create(
        0,
        AgentModel.create('claude-sonnet-4-5-20250929'),
        [taskDef],
        [GitRef.create(gitId, 'main')],
      );
      const wfResult = await createWorkflowUseCase.execute({
        name: 'Run Lifecycle Workflow',
        branchStrategy: 'feature/run',
        workDefinitions: [workDef],
        gitRefs: [GitRef.create(gitId, 'main')],
      });

      // Activate the workflow first (runs can only start from ACTIVE workflows)
      const activateUseCase = app.get(ActivateWorkflowUseCase);
      await activateUseCase.execute({ workflowId: wfResult.workflowId as WorkflowId });

      const startUseCase = app.get(StartWorkflowRunUseCase);
      // Event handlers are fire-and-forget, so the run starts but agent work
      // proceeds asynchronously. The run should be in RUNNING state immediately.
      const result = await startUseCase.execute({ workflowId: wfResult.workflowId as WorkflowId, issueKey: 'RUN-1' });

      expect(result.workflowRunId).toBeDefined();
      workflowRunId = result.workflowRunId as WorkflowRunId;

      const runRepo = app.get(WorkflowRunRepository);
      const run = await runRepo.findById(workflowRunId);
      expect(run).not.toBeNull();
      expect(run!.status).toBe('RUNNING');
    });

    it('should pause, resume, and cancel via direct domain manipulation', async () => {
      // Create a WorkflowRun directly and save to repository to test
      // pause/resume/cancel use cases without the event chain.
      const { WorkflowRun, WorkExecution, WorkflowSpace } = await import('@workflow-runtime/domain/index.js');
      const { WorkflowSpaceRepository } = await import('@workflow-runtime/domain/ports/workflow-space-repository.js');

      const createGitUseCase = app.get(CreateGitUseCase);
      const gitResult = await createGitUseCase.execute({
        url: 'https://github.com/lifecycle-org/lifecycle-repo.git',
        localPath: '/tmp/lifecycle-repo',
      });
      const gitId = gitResult.gitId as GitId;

      const createWorkflowUseCase = app.get(CreateWorkflowUseCase);
      const taskDef = TaskDefinition.create(0, 'Task for lifecycle');
      const workDef = WorkDefinition.create(
        0,
        AgentModel.create('claude-sonnet-4-5-20250929'),
        [taskDef],
        [GitRef.create(gitId, 'main')],
      );
      const wfResult = await createWorkflowUseCase.execute({
        name: 'Direct Lifecycle Workflow',
        branchStrategy: 'feature/lifecycle',
        workDefinitions: [workDef],
        gitRefs: [GitRef.create(gitId, 'main')],
      });

      // Create a WorkflowRun directly in RUNNING state with multiple work nodes
      // so that resume doesn't immediately complete the run
      const { WorkNodeConfig, TaskNodeConfig } = await import('@workflow-runtime/domain/value-objects/index.js');
      const workNodeConfig0 = WorkNodeConfig.create({
        sequence: 0,
        model: 'claude-sonnet-4-5-20250929',
        taskConfigs: [TaskNodeConfig.create(0, 'test query')],
      });
      const workNodeConfig1 = WorkNodeConfig.create({
        sequence: 1,
        model: 'claude-sonnet-4-5-20250929',
        taskConfigs: [TaskNodeConfig.create(0, 'test query 2')],
        pauseAfter: true,
      });
      const run = WorkflowRun.create({
        workflowId: wfResult.workflowId as WorkflowId,
        issueKey: 'TEST-001',
        gitRefPool: [],
        mcpServerRefPool: [],
        workNodeConfigs: [workNodeConfig0, workNodeConfig1],
      });
      const we = WorkExecution.create({
        workflowRunId: run.id,
        workflowId: wfResult.workflowId as WorkflowId,
        sequence: 0,
        model: 'claude-sonnet-4-5-20250929',
        taskProps: [{ order: 0, query: 'test query' }],
      });
      run.addWorkExecution(we.id);
      run.start();
      run.clearDomainEvents();
      we.clearDomainEvents();

      // Save directly to repositories
      const runRepo = app.get(WorkflowRunRepository);
      const weRepo = app.get(WorkExecutionRepository);
      const wsRepo = app.get(WorkflowSpaceRepository);

      await runRepo.save(run);
      await weRepo.save(we);

      // Create WorkflowSpace (required by StartNextWorkExecutionUseCase when resume triggers it)
      const workflowSpace = WorkflowSpace.create({
        workflowRunId: run.id,
        path: '/tmp/lifecycle-workspace',
      });
      await wsRepo.save(workflowSpace);

      // Test PAUSE
      const pauseUseCase = app.get(PauseWorkflowRunUseCase);
      await pauseUseCase.execute({ workflowRunId: run.id });

      let savedRun = await runRepo.findById(run.id);
      expect(savedRun).not.toBeNull();
      expect(savedRun!.status).toBe('PAUSED');

      // Test RESUME — WorkflowRunResumed event triggers StartNextWorkExecutionUseCase
      // which will advance the run. With pauseAfter on the second node, it will pause again.
      const resumeUseCase = app.get(ResumeWorkflowRunUseCase);
      await resumeUseCase.execute({ workflowRunId: run.id });

      savedRun = await runRepo.findById(run.id);
      expect(savedRun).not.toBeNull();
      // After resume, the handler starts the next work execution (index 0 still).
      // The run stays RUNNING since the handler processes work.
      expect(savedRun!.status).toBe('RUNNING');

      // Test CANCEL
      const cancelUseCase = app.get(CancelWorkflowRunUseCase);
      await cancelUseCase.execute({
        workflowRunId: run.id,
        reason: 'Test cancellation',
      });

      savedRun = await runRepo.findById(run.id);
      expect(savedRun).not.toBeNull();
      expect(savedRun!.status).toBe('CANCELLED');
      expect(savedRun!.cancellationReason).toBe('Test cancellation');
    });

    it('should reject invalid state transitions on terminal runs', async () => {
      // Create a completed run for testing
      const { WorkflowRun, WorkExecution } = await import('@workflow-runtime/domain/index.js');

      const { WorkNodeConfig, TaskNodeConfig } = await import('@workflow-runtime/domain/value-objects/index.js');
      const workNodeConfig = WorkNodeConfig.create({
        sequence: 0,
        model: 'claude-sonnet-4-5-20250929',
        taskConfigs: [TaskNodeConfig.create(0, 'test')],
      });
      const run = WorkflowRun.create({
        workflowId: 'a0000000-0000-4000-a000-000000000001' as WorkflowId,
        issueKey: 'TEST-001',
        gitRefPool: [],
        mcpServerRefPool: [],
        workNodeConfigs: [workNodeConfig],
      });
      const we = WorkExecution.create({
        workflowRunId: run.id,
        workflowId: 'a0000000-0000-4000-a000-000000000001' as WorkflowId,
        sequence: 0,
        model: 'claude-sonnet-4-5-20250929',
        taskProps: [{ order: 0, query: 'test' }],
      });
      run.addWorkExecution(we.id);
      run.start();
      run.cancel('Already cancelled');
      run.clearDomainEvents();
      we.clearDomainEvents();

      const runRepo = app.get(WorkflowRunRepository);
      const weRepo = app.get(WorkExecutionRepository);
      await runRepo.save(run);
      await weRepo.save(we);

      // Cannot cancel a cancelled run
      const cancelUseCase = app.get(CancelWorkflowRunUseCase);
      await expect(
        cancelUseCase.execute({ workflowRunId: run.id, reason: 'Nope' }),
      ).rejects.toThrow();

      // Cannot pause a cancelled run
      const pauseUseCase = app.get(PauseWorkflowRunUseCase);
      await expect(
        pauseUseCase.execute({ workflowRunId: run.id }),
      ).rejects.toThrow();

      // Cannot resume a cancelled run
      const resumeUseCase = app.get(ResumeWorkflowRunUseCase);
      await expect(
        resumeUseCase.execute({ workflowRunId: run.id }),
      ).rejects.toThrow();
    });
  });
});
