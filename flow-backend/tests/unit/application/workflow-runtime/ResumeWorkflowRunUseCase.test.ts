import { describe, it, expect, vi } from 'vitest';
import {
  ResumeWorkflowRunUseCase,
  WorkflowRunNotFoundError,
  WorkflowRunCannotResumeError,
} from '@workflow-runtime/application/commands/resume-workflow-run-use-case.js';
import { WorkflowRun, Report } from '@workflow-runtime/domain/index.js';
import type {
  WorkflowRunRepository, WorkExecutionRepository,
  CheckpointRepository, WorkTreeRepository, WorkflowSpaceRepository,
  ReportRepository, EventPublisher,
} from '@workflow-runtime/domain/index.js';
import type { FileSystem } from '@workflow-runtime/domain/ports/file-system.js';
import type { GitService } from '@common/ports/index.js';
import type { WorkflowId } from '@common/ids/index.js';
import { WorkflowRunId, WorkExecutionId, WorkNodeConfig, TaskNodeConfig, WorkflowRunStatus, ReportId, TaskExecutionId } from '@workflow-runtime/domain/value-objects/index.js';
import { ReportOutline, Section } from '@common/value-objects/index.js';

const WF_ID = 'wf-001' as WorkflowId;

function makeWorkNodeConfig(sequence: number): WorkNodeConfig {
  return WorkNodeConfig.create({
    sequence,
    model: 'claude-sonnet',
    taskConfigs: [TaskNodeConfig.create(0, 'test query')],
  });
}

function createMocks() {
  const workflowRunRepository: WorkflowRunRepository = {
    findById: vi.fn(),
    findByWorkflowId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  };
  const workExecutionRepository: WorkExecutionRepository = {
    findById: vi.fn(),
    findByWorkflowRunId: vi.fn(),
    findByWorkflowRunIdOrderedBySequence: vi.fn().mockResolvedValue([]),
    save: vi.fn(),
    saveAll: vi.fn(),
    delete: vi.fn(),
    deleteByWorkflowRunId: vi.fn(),
    exists: vi.fn(),
  };
  const checkpointRepository: CheckpointRepository = {
    findById: vi.fn(),
    findByWorkflowRunId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    deleteByWorkflowRunId: vi.fn(),
    exists: vi.fn(),
  };
  const workTreeRepository: WorkTreeRepository = {
    findById: vi.fn(),
    findByWorkflowRunId: vi.fn().mockResolvedValue([]),
    save: vi.fn(),
    delete: vi.fn(),
    deleteByWorkflowRunId: vi.fn(),
    exists: vi.fn(),
  };
  const workflowSpaceRepository: WorkflowSpaceRepository = {
    findById: vi.fn(),
    findByWorkflowRunId: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    deleteByWorkflowRunId: vi.fn(),
    exists: vi.fn(),
  };
  const reportRepository: ReportRepository = {
    findById: vi.fn(),
    findByWorkflowRunId: vi.fn().mockResolvedValue([]),
    save: vi.fn(),
    delete: vi.fn(),
    deleteByWorkflowRunId: vi.fn(),
    exists: vi.fn(),
  };
  const fileSystem: FileSystem = {
    createDirectory: vi.fn(),
    deleteDirectory: vi.fn(),
    directoryExists: vi.fn(),
    createFile: vi.fn(),
    readFile: vi.fn(),
    deleteFile: vi.fn(),
    fileExists: vi.fn(),
    createSymlink: vi.fn(),
    deleteSymlink: vi.fn(),
    stat: vi.fn(),
    list: vi.fn(),
    copy: vi.fn(),
    move: vi.fn(),
  };
  const gitService: GitService = {
    clone: vi.fn(),
    deleteRepo: vi.fn(),
    getCurrentCommit: vi.fn(),
    reset: vi.fn(),
  };
  const eventPublisher: EventPublisher = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  const unitOfWork = { run: async <T>(work: () => Promise<T>) => work() };
  return { workflowRunRepository, workExecutionRepository, checkpointRepository, workTreeRepository, workflowSpaceRepository, reportRepository, fileSystem, gitService, eventPublisher, unitOfWork };
}

function createUseCase(mocks: ReturnType<typeof createMocks>) {
  return new ResumeWorkflowRunUseCase(
    mocks.workflowRunRepository as never,
    mocks.workExecutionRepository as never,
    mocks.checkpointRepository as never,
    mocks.workTreeRepository as never,
    mocks.workflowSpaceRepository as never,
    mocks.reportRepository as never,
    mocks.fileSystem as never,
    mocks.gitService as never,
    mocks.eventPublisher as never,
    mocks.unitOfWork as never,
  );
}

function createPausedRun(): WorkflowRun {
  const run = WorkflowRun.create({
    workflowId: WF_ID,
    issueKey: 'TEST-001',
    gitRefPool: [],
    mcpServerRefPool: [],
    workNodeConfigs: [makeWorkNodeConfig(0)],
  });
  run.addWorkExecution('we-0' as WorkExecutionId);
  run.start();
  run.pause();
  run.clearDomainEvents();
  return run;
}

describe('ResumeWorkflowRunUseCase', () => {
  it('resumes a paused workflow run', async () => {
    const mocks = createMocks();
    const run = createPausedRun();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);

    const useCase = createUseCase(mocks);
    await useCase.execute({ workflowRunId: run.id });

    expect(mocks.workflowRunRepository.save).toHaveBeenCalledOnce();
    expect(mocks.eventPublisher.publishAll).toHaveBeenCalledOnce();
  });

  it('throws WorkflowRunNotFoundError when not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(null);

    const useCase = createUseCase(mocks);
    await expect(
      useCase.execute({ workflowRunId: 'nonexistent' as WorkflowRunId }),
    ).rejects.toThrow(WorkflowRunNotFoundError);
  });

  it('resumes an awaiting workflow run without revert', async () => {
    const mocks = createMocks();
    const run = WorkflowRun.create({
      workflowId: WF_ID,
      issueKey: 'TEST-001',
      gitRefPool: [],
      mcpServerRefPool: [],
      workNodeConfigs: [makeWorkNodeConfig(0), makeWorkNodeConfig(1)],
    });
    run.addWorkExecution('we-0' as WorkExecutionId);
    run.start();
    run.advanceWork();
    run.await();
    run.clearDomainEvents();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);

    const useCase = createUseCase(mocks);
    await useCase.execute({ workflowRunId: run.id });

    expect(run.status).toBe(WorkflowRunStatus.RUNNING);
    expect(mocks.checkpointRepository.findByWorkflowRunId).not.toHaveBeenCalled();
    expect(mocks.gitService.reset).not.toHaveBeenCalled();
    expect(mocks.workflowRunRepository.save).toHaveBeenCalledOnce();
  });

  it('auto-reverts to previous checkpoint when resuming from PAUSED at index > 0', async () => {
    const mocks = createMocks();
    const run = WorkflowRun.create({
      workflowId: WF_ID,
      issueKey: 'TEST-001',
      gitRefPool: [],
      mcpServerRefPool: [],
      workNodeConfigs: [makeWorkNodeConfig(0), makeWorkNodeConfig(1)],
    });
    run.addWorkExecution('we-0' as WorkExecutionId);
    run.addWorkExecution('we-1' as WorkExecutionId);
    run.start();
    run.advanceWork(); // index 0→1
    run.pause();
    run.clearDomainEvents();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);
    vi.mocked(mocks.checkpointRepository.findByWorkflowRunId).mockResolvedValue([
      { workSequence: 0, getCommitHash: vi.fn().mockReturnValue('abc123') } as never,
    ]);
    vi.mocked(mocks.workflowSpaceRepository.findByWorkflowRunId).mockResolvedValue(null);

    const useCase = createUseCase(mocks);
    await useCase.execute({ workflowRunId: run.id });

    expect(run.status).toBe(WorkflowRunStatus.RUNNING);
    expect(mocks.checkpointRepository.findByWorkflowRunId).toHaveBeenCalledOnce();
    expect(mocks.gitService.reset).not.toHaveBeenCalled(); // no work trees
  });

  it('deletes report files and WorkExecutions on auto-revert', async () => {
    const mocks = createMocks();
    const run = WorkflowRun.create({
      workflowId: WF_ID,
      issueKey: 'TEST-001',
      gitRefPool: [],
      mcpServerRefPool: [],
      workNodeConfigs: [makeWorkNodeConfig(0), makeWorkNodeConfig(1)],
    });
    const trimmedWeId = 'we-1' as WorkExecutionId;
    run.addWorkExecution('we-0' as WorkExecutionId);
    run.addWorkExecution(trimmedWeId);
    run.start();
    run.advanceWork();
    run.pause();
    run.clearDomainEvents();

    const report = Report.fromProps({
      id: ReportId.generate(),
      taskExecutionId: 'te-1' as TaskExecutionId,
      workExecutionId: trimmedWeId,
      workflowRunId: run.id,
      outline: ReportOutline.create([Section.create('Test', 'Test section')]),
      filePath: '/tmp/report-1.md',
      status: 'COMPLETED' as never,
    });

    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);
    vi.mocked(mocks.checkpointRepository.findByWorkflowRunId).mockResolvedValue([
      { workSequence: 0, getCommitHash: vi.fn().mockReturnValue('abc123') } as never,
    ]);
    vi.mocked(mocks.workflowSpaceRepository.findByWorkflowRunId).mockResolvedValue(null);
    vi.mocked(mocks.reportRepository.findByWorkflowRunId).mockResolvedValue([report]);

    const useCase = createUseCase(mocks);
    await useCase.execute({ workflowRunId: run.id });

    expect(mocks.fileSystem.deleteFile).toHaveBeenCalledWith('/tmp/report-1.md');
    expect(mocks.reportRepository.delete).toHaveBeenCalledWith(report.id);
    expect(mocks.workExecutionRepository.delete).toHaveBeenCalledWith(trimmedWeId);
  });

  it('throws WorkflowRunCannotResumeError for running run', async () => {
    const mocks = createMocks();
    const run = WorkflowRun.create({
      workflowId: WF_ID,
      issueKey: 'TEST-001',
      gitRefPool: [],
      mcpServerRefPool: [],
      workNodeConfigs: [makeWorkNodeConfig(0)],
    });
    run.addWorkExecution('we-0' as WorkExecutionId);
    run.start();
    vi.mocked(mocks.workflowRunRepository.findById).mockResolvedValue(run);

    const useCase = createUseCase(mocks);
    await expect(
      useCase.execute({ workflowRunId: run.id }),
    ).rejects.toThrow(WorkflowRunCannotResumeError);
  });
});
