import { describe, it, expect } from 'vitest';
import { Workflow } from '@workflow/domain/entities/workflow.js';
import { WorkDefinition, TaskDefinition, GitRef, AgentModel, BranchStrategy, WorkflowStatus } from '@workflow/domain/index.js';
import type { GitId } from '@common/ids/index.js';

const GIT_ID = 'git-001' as GitId;

function makeValidProps() {
  const task = TaskDefinition.create(0, 'Do something');
  const model = AgentModel.create('claude-sonnet-4-5-20250929');
  const workDef = WorkDefinition.create(0, model, [task]);
  const gitRef = GitRef.create(GIT_ID, 'main');
  return {
    name: 'Test Workflow',
    branchStrategy: BranchStrategy.create('feature'),
    workDefinitions: [workDef],
    gitRefs: [gitRef],
  };
}

describe('Workflow', () => {
  it('creates with correct properties', () => {
    const workflow = Workflow.create(makeValidProps());
    expect(workflow.id).toBeDefined();
    expect(workflow.name).toBe('Test Workflow');
    expect(workflow.workDefinitions).toHaveLength(1);
    expect(workflow.gitRefs).toHaveLength(1);
    expect(workflow.status).toBe(WorkflowStatus.DRAFT);
  });

  it('emits WorkflowCreated and WorkflowGitRefsUpdated on create with gitRefs', () => {
    const workflow = Workflow.create(makeValidProps());
    const events = workflow.getDomainEvents();
    expect(events).toHaveLength(2);
    expect(events[0].eventType).toBe('workflow.created');
    expect(events[1].eventType).toBe('workflow.git-refs-updated');
  });

  it('emits only WorkflowCreated on create without gitRefs', () => {
    const props = makeValidProps();
    const workflow = Workflow.create({ ...props, gitRefs: [] });
    const events = workflow.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('workflow.created');
  });

  it('throws on empty name', () => {
    expect(() => Workflow.create({ ...makeValidProps(), name: '' })).toThrow();
  });

  it('throws on blank name', () => {
    expect(() => Workflow.create({ ...makeValidProps(), name: '   ' })).toThrow();
  });

  it('throws on empty workDefinitions', () => {
    expect(() => Workflow.create({ ...makeValidProps(), workDefinitions: [] })).toThrow();
  });

  it('updateName emits WorkflowUpdated', () => {
    const workflow = Workflow.create(makeValidProps());
    workflow.clearDomainEvents();
    workflow.updateName('New Name');
    expect(workflow.name).toBe('New Name');
    const events = workflow.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('workflow.updated');
  });

  it('updateName throws on empty name', () => {
    const workflow = Workflow.create(makeValidProps());
    expect(() => workflow.updateName('')).toThrow();
  });

  it('updateDescription emits WorkflowUpdated', () => {
    const workflow = Workflow.create(makeValidProps());
    workflow.clearDomainEvents();
    workflow.updateDescription('New desc');
    expect(workflow.description).toBe('New desc');
    const events = workflow.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('workflow.updated');
  });

  it('updateGitRefs emits WorkflowGitRefsUpdated', () => {
    const workflow = Workflow.create(makeValidProps());
    workflow.clearDomainEvents();
    const newGitRef = GitRef.create('git-002' as GitId, 'develop');
    workflow.updateGitRefs([newGitRef]);
    const events = workflow.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('workflow.git-refs-updated');
  });

  it('updateMcpServerRefs emits WorkflowMcpServerRefsUpdated', () => {
    const workflow = Workflow.create(makeValidProps());
    workflow.clearDomainEvents();
    // empty to empty = no event
    workflow.updateMcpServerRefs([]);
    const events = workflow.getDomainEvents();
    expect(events).toHaveLength(0);
  });

  it('delete emits ref cleanup events and WorkflowDeleted', () => {
    const workflow = Workflow.create(makeValidProps());
    workflow.clearDomainEvents();
    workflow.delete();
    const events = workflow.getDomainEvents();
    const eventTypes = events.map((e) => e.eventType);
    expect(eventTypes).toContain('workflow.git-refs-updated');
    expect(eventTypes).toContain('workflow.deleted');
  });

  it('removeGitRef emits WorkflowGitRefsUpdated', () => {
    const workflow = Workflow.create(makeValidProps());
    workflow.clearDomainEvents();
    workflow.removeGitRef(GIT_ID);
    expect(workflow.gitRefs).toHaveLength(0);
    const events = workflow.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('workflow.git-refs-updated');
  });

  // ==================== Status Transition Tests ====================

  it('activate transitions from DRAFT to ACTIVE', () => {
    const workflow = Workflow.create(makeValidProps());
    workflow.clearDomainEvents();
    workflow.activate();
    expect(workflow.status).toBe(WorkflowStatus.ACTIVE);
    const events = workflow.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('workflow.activated');
  });

  it('activate throws with invalid git refs', () => {
    const workflow = Workflow.create(makeValidProps());
    workflow.markGitRefInvalid(GIT_ID);
    expect(() => workflow.activate()).toThrow();
  });

  it('deactivate transitions from ACTIVE to DRAFT', () => {
    const workflow = Workflow.create(makeValidProps());
    workflow.activate();
    workflow.clearDomainEvents();
    workflow.deactivate();
    expect(workflow.status).toBe(WorkflowStatus.DRAFT);
    const events = workflow.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('workflow.deactivated');
  });

  it('deactivate throws when not ACTIVE', () => {
    const workflow = Workflow.create(makeValidProps());
    expect(() => workflow.deactivate()).toThrow();
  });

  // ==================== DRAFT Guard Tests ====================

  it('updateName throws when not in DRAFT status', () => {
    const workflow = Workflow.create(makeValidProps());
    workflow.activate();
    expect(() => workflow.updateName('New')).toThrow();
  });

  it('updateDescription throws when not in DRAFT status', () => {
    const workflow = Workflow.create(makeValidProps());
    workflow.activate();
    expect(() => workflow.updateDescription('New')).toThrow();
  });

  // ==================== markGitRefInvalid / markMcpServerRefInvalid ====================

  it('markGitRefInvalid marks ref as invalid and emits WorkflowUpdated', () => {
    const workflow = Workflow.create(makeValidProps());
    workflow.clearDomainEvents();
    workflow.markGitRefInvalid(GIT_ID);
    expect(workflow.gitRefs[0].valid).toBe(false);
    const events = workflow.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('workflow.updated');
  });
});
