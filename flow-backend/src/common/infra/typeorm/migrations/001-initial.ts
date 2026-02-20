import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. workflows
    await queryRunner.query(`
      CREATE TABLE workflows (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        issue_key VARCHAR(50) NOT NULL,
        branch_strategy JSONB NOT NULL,
        git_refs JSONB NOT NULL DEFAULT '[]',
        mcp_server_refs JSONB NOT NULL DEFAULT '[]',
        work_definitions JSONB NOT NULL DEFAULT '[]',
        version INT NOT NULL DEFAULT 0
      );
    `);

    // 2. gits
    await queryRunner.query(`
      CREATE TABLE gits (
        id UUID PRIMARY KEY,
        url VARCHAR(500) NOT NULL,
        local_path VARCHAR(500) NOT NULL,
        version INT NOT NULL DEFAULT 0
      );
    `);

    // 3. mcp_servers
    await queryRunner.query(`
      CREATE TABLE mcp_servers (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        command VARCHAR(500) NOT NULL,
        args JSONB NOT NULL DEFAULT '[]',
        env JSONB NOT NULL DEFAULT '{}',
        transport_type VARCHAR(50) NOT NULL,
        url VARCHAR(500),
        version INT NOT NULL DEFAULT 0
      );
    `);

    // 4. agent_sessions
    await queryRunner.query(`
      CREATE TABLE agent_sessions (
        id UUID PRIMARY KEY,
        work_execution_id UUID NOT NULL,
        workflow_run_id UUID NOT NULL,
        model VARCHAR(100) NOT NULL,
        workspace_path VARCHAR(500) NOT NULL,
        mcp_server_configs JSONB NOT NULL DEFAULT '[]',
        process_id VARCHAR(255),
        session_id VARCHAR(255),
        version INT NOT NULL DEFAULT 0
      );
    `);

    // 5. workflow_runs
    await queryRunner.query(`
      CREATE TABLE workflow_runs (
        id UUID PRIMARY KEY,
        workflow_id UUID NOT NULL,
        status VARCHAR(20) NOT NULL,
        current_work_index INT NOT NULL DEFAULT 0,
        cancelled_at_work_index INT,
        cancellation_reason TEXT,
        work_execution_ids JSONB NOT NULL DEFAULT '[]',
        version INT NOT NULL DEFAULT 0
      );
    `);

    // 6. work_executions
    await queryRunner.query(`
      CREATE TABLE work_executions (
        id UUID PRIMARY KEY,
        workflow_run_id UUID NOT NULL,
        workflow_id UUID NOT NULL,
        sequence INT NOT NULL,
        model VARCHAR(100) NOT NULL,
        task_executions JSONB NOT NULL DEFAULT '[]',
        current_task_index INT NOT NULL DEFAULT 0,
        is_completed BOOLEAN NOT NULL DEFAULT FALSE,
        is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
        version INT NOT NULL DEFAULT 0
      );
    `);

    // 7. reports
    await queryRunner.query(`
      CREATE TABLE reports (
        id UUID PRIMARY KEY,
        task_execution_id UUID NOT NULL,
        work_execution_id UUID NOT NULL,
        workflow_run_id UUID NOT NULL,
        outline JSONB NOT NULL,
        file_path VARCHAR(500),
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        version INT NOT NULL DEFAULT 0
      );
    `);

    // 8. checkpoints
    await queryRunner.query(`
      CREATE TABLE checkpoints (
        id UUID PRIMARY KEY,
        workflow_run_id UUID NOT NULL,
        workflow_id UUID NOT NULL,
        work_execution_id UUID NOT NULL,
        work_sequence INT NOT NULL,
        commit_hashes JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        version INT NOT NULL DEFAULT 0
      );
    `);

    // 9. work_trees
    await queryRunner.query(`
      CREATE TABLE work_trees (
        id UUID PRIMARY KEY,
        git_id UUID NOT NULL,
        workflow_run_id UUID NOT NULL,
        path VARCHAR(500) NOT NULL,
        branch VARCHAR(255) NOT NULL,
        version INT NOT NULL DEFAULT 0
      );
    `);

    // 10. workflow_spaces
    await queryRunner.query(`
      CREATE TABLE workflow_spaces (
        id UUID PRIMARY KEY,
        workflow_run_id UUID NOT NULL,
        path VARCHAR(500) NOT NULL,
        work_spaces JSONB NOT NULL DEFAULT '[]',
        version INT NOT NULL DEFAULT 0
      );
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX idx_workflow_runs_workflow_id ON workflow_runs (workflow_id);`);
    await queryRunner.query(`CREATE INDEX idx_work_executions_workflow_run_id ON work_executions (workflow_run_id);`);
    await queryRunner.query(`CREATE INDEX idx_work_executions_sequence ON work_executions (workflow_run_id, sequence);`);
    await queryRunner.query(`CREATE INDEX idx_reports_workflow_run_id ON reports (workflow_run_id);`);
    await queryRunner.query(`CREATE INDEX idx_checkpoints_workflow_run_id ON checkpoints (workflow_run_id);`);
    await queryRunner.query(`CREATE INDEX idx_work_trees_workflow_run_id ON work_trees (workflow_run_id);`);
    await queryRunner.query(`CREATE INDEX idx_workflow_spaces_workflow_run_id ON workflow_spaces (workflow_run_id);`);
    await queryRunner.query(`CREATE INDEX idx_agent_sessions_work_execution_id ON agent_sessions (work_execution_id);`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_agent_sessions_work_execution_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_workflow_spaces_workflow_run_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_work_trees_workflow_run_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_checkpoints_workflow_run_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reports_workflow_run_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_work_executions_sequence;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_work_executions_workflow_run_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_workflow_runs_workflow_id;`);

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS workflow_spaces;`);
    await queryRunner.query(`DROP TABLE IF EXISTS work_trees;`);
    await queryRunner.query(`DROP TABLE IF EXISTS checkpoints;`);
    await queryRunner.query(`DROP TABLE IF EXISTS reports;`);
    await queryRunner.query(`DROP TABLE IF EXISTS work_executions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS workflow_runs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS agent_sessions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS mcp_servers;`);
    await queryRunner.query(`DROP TABLE IF EXISTS gits;`);
    await queryRunner.query(`DROP TABLE IF EXISTS workflows;`);
  }
}
