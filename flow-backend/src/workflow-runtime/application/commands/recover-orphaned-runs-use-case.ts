import { Injectable, Logger } from '@nestjs/common';
import { WorkflowRunRepository } from '../../domain/ports/workflow-run-repository.js';
import { EventPublisher } from '@common/ports/index.js';

@Injectable()
export class RecoverOrphanedRunsUseCase {
  private readonly logger = new Logger(RecoverOrphanedRunsUseCase.name);

  constructor(
    private readonly workflowRunRepository: WorkflowRunRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(): Promise<number> {
    const allRuns = await this.workflowRunRepository.findAll();
    const orphaned = allRuns.filter((r) => r.canPause());

    for (const run of orphaned) {
      run.pause();
      await this.workflowRunRepository.save(run);
      await this.eventPublisher.publishAll(run.clearDomainEvents());
    }

    if (orphaned.length > 0) {
      this.logger.log(`Paused ${orphaned.length} orphaned RUNNING workflow run(s)`);
    }

    return orphaned.length;
  }
}
