import { EntitySchema } from 'typeorm';

export interface GitRow {
  id: string;
  url: string;
  local_path: string;
  version: number;
}

export const GitSchema = new EntitySchema<GitRow>({
  name: 'git',
  tableName: 'gits',
  columns: {
    id: { type: 'uuid', primary: true },
    url: { type: 'varchar', length: 500 },
    local_path: { type: 'varchar', length: 500 },
    version: { type: 'int', default: 0 },
  },
});
