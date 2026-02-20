import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { WorkflowConfigReader, WorkflowRunActiveChecker } from '../ports/index.js';
import { WorkflowRepository } from '@workflow/domain/ports/workflow-repository.js';
import { WorkflowRunRepository } from '@workflow-runtime/domain/ports/workflow-run-repository.js';
import { InMemoryWorkflowRepository } from '@workflow/infra/in-memory-workflow-repository.js';
import { InMemoryWorkflowRunRepository } from '@workflow-runtime/infra/in-memory-workflow-run-repository.js';
import { WorkflowTypeormRepository } from '@workflow/infra/typeorm/workflow-typeorm-repository.js';
import { WorkflowRunTypeormRepository } from '@workflow-runtime/infra/typeorm/workflow-run-typeorm-repository.js';
import { WorkflowSchema, type WorkflowRow } from '@workflow/infra/typeorm/workflow.schema.js';
import { WorkflowRunSchema, type WorkflowRunRow } from '@workflow-runtime/infra/typeorm/workflow-run.schema.js';
import { WorkflowConfigReaderImpl } from '@workflow/infra/workflow-config-reader-impl.js';
import { WorkflowRunActiveCheckerImpl } from '@workflow-runtime/infra/workflow-run-active-checker-impl.js';

const useDb = process.env.USE_DB !== 'false';

const workflowRepoProvider: Provider = useDb
  ? {
      provide: WorkflowRepository,
      useFactory: (repo: Repository<WorkflowRow>) => new WorkflowTypeormRepository(repo),
      inject: [getRepositoryToken(WorkflowSchema)],
    }
  : { provide: WorkflowRepository, useClass: InMemoryWorkflowRepository };

const workflowRunRepoProvider: Provider = useDb
  ? {
      provide: WorkflowRunRepository,
      useFactory: (repo: Repository<WorkflowRunRow>) => new WorkflowRunTypeormRepository(repo),
      inject: [getRepositoryToken(WorkflowRunSchema)],
    }
  : { provide: WorkflowRunRepository, useClass: InMemoryWorkflowRunRepository };

const imports: Array<DynamicModule> = [];
if (useDb) {
  imports.push(TypeOrmModule.forFeature([WorkflowSchema, WorkflowRunSchema]));
}

@Module({
  imports,
  providers: [
    workflowRepoProvider,
    workflowRunRepoProvider,
    {
      provide: WorkflowConfigReader,
      useFactory: (repo: WorkflowRepository) => new WorkflowConfigReaderImpl(repo),
      inject: [WorkflowRepository],
    },
    {
      provide: WorkflowRunActiveChecker,
      useFactory: (repo: WorkflowRunRepository) => new WorkflowRunActiveCheckerImpl(repo),
      inject: [WorkflowRunRepository],
    },
  ],
  exports: [
    WorkflowRepository,
    WorkflowRunRepository,
    WorkflowConfigReader,
    WorkflowRunActiveChecker,
  ],
})
export class WorkflowQueryModule {}
