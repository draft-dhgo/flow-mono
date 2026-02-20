import type { DataSourceOptions } from 'typeorm';

export function createDatabaseConfig(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'workflow_backend',
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
  };
}
