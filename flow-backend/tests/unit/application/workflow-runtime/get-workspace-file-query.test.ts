import { describe, it, expect, vi } from 'vitest';
import { GetWorkspaceFileQuery } from '@workflow-runtime/application/queries/get-workspace-file-query.js';
import { WorkflowSpace } from '@workflow-runtime/domain/entities/workflow-space.js';
import { WorkflowRunId, WorkflowSpaceId } from '@workflow-runtime/domain/value-objects/index.js';
import type { WorkflowSpaceRepository } from '@workflow-runtime/domain/ports/workflow-space-repository.js';
import type { FileSystem, FileSystemStats } from '@workflow-runtime/domain/ports/file-system.js';
import { ApplicationError } from '@common/errors/index.js';

function createMocks() {
  const workflowSpaceRepository: WorkflowSpaceRepository = {
    findById: vi.fn(),
    findByWorkflowRunId: vi.fn(),
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
  return { workflowSpaceRepository, fileSystem };
}

const RUN_ID = WorkflowRunId.generate();

function makeWorkflowSpace(): WorkflowSpace {
  return WorkflowSpace.fromProps({
    id: WorkflowSpaceId.generate(),
    workflowRunId: RUN_ID,
    path: '/tmp/workspace',
    workSpaces: [],
  });
}

function makeFileStat(isDirectory: boolean, size: number = 100): FileSystemStats {
  return {
    isFile: !isDirectory,
    isDirectory,
    isSymbolicLink: false,
    size,
    modifiedAt: new Date(),
  };
}

describe('GetWorkspaceFileQuery', () => {
  it('returns file content when file exists', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowSpaceRepository.findByWorkflowRunId).mockResolvedValue(makeWorkflowSpace());
    vi.mocked(mocks.fileSystem.stat).mockResolvedValue(makeFileStat(false, 500));
    vi.mocked(mocks.fileSystem.readFile).mockResolvedValue('file content here');

    const query = new GetWorkspaceFileQuery(mocks.workflowSpaceRepository, mocks.fileSystem);
    const result = await query.execute(RUN_ID, 'src/index.ts');

    expect(result.content).toBe('file content here');
    expect(result.path).toBe('src/index.ts');
  });

  it('throws ApplicationError when workspace not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowSpaceRepository.findByWorkflowRunId).mockResolvedValue(null);

    const query = new GetWorkspaceFileQuery(mocks.workflowSpaceRepository, mocks.fileSystem);

    await expect(query.execute(RUN_ID, 'src/index.ts')).rejects.toThrow(ApplicationError);
  });

  it('throws ApplicationError when path traversal is attempted', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowSpaceRepository.findByWorkflowRunId).mockResolvedValue(makeWorkflowSpace());

    const query = new GetWorkspaceFileQuery(mocks.workflowSpaceRepository, mocks.fileSystem);

    await expect(query.execute(RUN_ID, '../../etc/passwd')).rejects.toThrow(ApplicationError);
  });

  it('throws ApplicationError when target is a directory', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowSpaceRepository.findByWorkflowRunId).mockResolvedValue(makeWorkflowSpace());
    vi.mocked(mocks.fileSystem.stat).mockResolvedValue(makeFileStat(true));

    const query = new GetWorkspaceFileQuery(mocks.workflowSpaceRepository, mocks.fileSystem);

    await expect(query.execute(RUN_ID, 'src')).rejects.toThrow(ApplicationError);
  });

  it('throws ApplicationError when file is too large', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowSpaceRepository.findByWorkflowRunId).mockResolvedValue(makeWorkflowSpace());
    vi.mocked(mocks.fileSystem.stat).mockResolvedValue(makeFileStat(false, 2_000_000));

    const query = new GetWorkspaceFileQuery(mocks.workflowSpaceRepository, mocks.fileSystem);

    await expect(query.execute(RUN_ID, 'large-file.bin')).rejects.toThrow(ApplicationError);
  });
});
