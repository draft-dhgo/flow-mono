import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SchemaSync003 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // workflows: add seed_keys, status; drop issue_key (moved to workflow_runs)
    await queryRunner.query(
      `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS seed_keys JSONB NOT NULL DEFAULT '[]';`,
    );
    await queryRunner.query(
      `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'DRAFT';`,
    );
    await queryRunner.query(
      `ALTER TABLE workflows DROP COLUMN IF EXISTS issue_key;`,
    );

    // workflow_runs: add missing columns
    await queryRunner.query(
      `ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS issue_key VARCHAR(50) NOT NULL DEFAULT '';`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS seed_values JSONB NOT NULL DEFAULT '{}';`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS git_ref_pool JSONB NOT NULL DEFAULT '[]';`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS mcp_server_ref_pool JSONB NOT NULL DEFAULT '[]';`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS work_node_configs JSONB NOT NULL DEFAULT '[]';`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS restored_to_checkpoint BOOLEAN NOT NULL DEFAULT FALSE;`,
    );

    // work_executions: add work_node_config_id
    await queryRunner.query(
      `ALTER TABLE work_executions ADD COLUMN IF NOT EXISTS work_node_config_id UUID;`,
    );

    // reports: add content
    await queryRunner.query(
      `ALTER TABLE reports ADD COLUMN IF NOT EXISTS content TEXT;`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse workflow_runs changes
    await queryRunner.query(
      `ALTER TABLE workflow_runs DROP COLUMN IF EXISTS restored_to_checkpoint;`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_runs DROP COLUMN IF EXISTS work_node_configs;`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_runs DROP COLUMN IF EXISTS mcp_server_ref_pool;`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_runs DROP COLUMN IF EXISTS git_ref_pool;`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_runs DROP COLUMN IF EXISTS seed_values;`,
    );
    await queryRunner.query(
      `ALTER TABLE workflow_runs DROP COLUMN IF EXISTS issue_key;`,
    );

    // Reverse reports changes
    await queryRunner.query(
      `ALTER TABLE reports DROP COLUMN IF EXISTS content;`,
    );

    // Reverse work_executions changes
    await queryRunner.query(
      `ALTER TABLE work_executions DROP COLUMN IF EXISTS work_node_config_id;`,
    );

    // Reverse workflows changes
    await queryRunner.query(
      `ALTER TABLE workflows DROP COLUMN IF EXISTS status;`,
    );
    await queryRunner.query(
      `ALTER TABLE workflows DROP COLUMN IF EXISTS seed_keys;`,
    );
    await queryRunner.query(
      `ALTER TABLE workflows ADD COLUMN IF NOT EXISTS issue_key VARCHAR(50) NOT NULL DEFAULT '';`,
    );
  }
}
