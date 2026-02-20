import { DomainError } from '@common/errors/index.js';
import type { GitId, WorkflowId } from '@common/ids/index.js';

export class GitReferencedByWorkflowError extends DomainError {
  constructor(gitId: GitId, workflowIds: WorkflowId[]) {
    super(
      'GIT_REFERENCED_BY_WORKFLOW',
      `Git repository ${gitId} is referenced by workflows: [${workflowIds.join(', ')}]. Remove workflow references before deleting.`,
    );
  }
}
