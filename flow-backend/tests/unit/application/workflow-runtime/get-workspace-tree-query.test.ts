import { describe, it, expect, vi } from 'vitest';
import { GetWorkspaceTreeQuery } from '@workflow-runtime/application/queries/get-workspace-tree-query.js';
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

describe('GetWorkspaceTreeQuery', () => {
  it('returns file tree entries for workspace', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowSpaceRepository.findByWorkflowRunId).mockResolvedValue(makeWorkflowSpace());
    vi.mocked(mocks.fileSystem.list)
      .mockResolvedValueOnce(['src', 'README.md'])
      .mockResolvedValueOnce(['index.ts']);
    vi.mocked(mocks.fileSystem.stat)
      .mockResolvedValueOnce(makeFileStat(true))
      .mockResolvedValueOnce(makeFileStat(false, 500))
      .mockResolvedValueOnce(makeFileStat(false, 200));

    const query = new GetWorkspaceTreeQuery(mocks.workflowSpaceRepository, mocks.fileSystem);
    const result = await query.execute(RUN_ID);

    expect(result).toHaveLength(3);
    const paths = result.map((e) => e.path);
    expect(paths).toContain('src');
    expect(paths).toContain('README.md');
    expect(paths).toContain('src/index.ts');
  });

  it('excludes node_modules and .git directories from traversal', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowSpaceRepository.findByWorkflowRunId).mockResolvedValue(makeWorkflowSpace());
    vi.mocked(mocks.fileSystem.list).mockResolvedValueOnce(['node_modules', '.git', 'src']);
    vi.mocked(mocks.fileSystem.stat)
      .mockResolvedValueOnce(makeFileStat(true))
      .mockResolvedValueOnce(makeFileStat(true))
      .mockResolvedValueOnce(makeFileStat(true));
    // src directory traversal
    vi.mocked(mocks.fileSystem.list).mockResolvedValueOnce([]);

    const query = new GetWorkspaceTreeQuery(mocks.workflowSpaceRepository, mocks.fileSystem);
    const result = await query.execute(RUN_ID);

    // node_modules and .git are listed but not recursed into
    expect(result).toHaveLength(3);
    expect(result.some((e) => e.path === 'node_modules')).toBe(true);
    expect(result.some((e) => e.path === '.git')).toBe(true);
    // No entries under node_modules or .git since they weren't traversed
    expect(result.filter((e) => e.path.startsWith('node_modules/')).length).toBe(0);
  });

  it('throws ApplicationError when workspace not found', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowSpaceRepository.findByWorkflowRunId).mockResolvedValue(null);

    const query = new GetWorkspaceTreeQuery(mocks.workflowSpaceRepository, mocks.fileSystem);

    await expect(query.execute(RUN_ID)).rejects.toThrow(ApplicationError);
    await expect(query.execute(RUN_ID)).rejects.toThrow(/not found/i);
  });

  it('returns empty list for empty workspace', async () => {
    const mocks = createMocks();
    vi.mocked(mocks.workflowSpaceRepository.findByWorkflowRunId).mockResolvedValue(makeWorkflowSpace());
    vi.mocked(mocks.fileSystem.list).mockResolvedValueOnce([]);

    const query = new GetWorkspaceTreeQuery(mocks.workflowSpaceRepository, mocks.fileSystem);
    const result = await query.execute(RUN_ID);

    expect(result).toEqual([]);
  });
});
