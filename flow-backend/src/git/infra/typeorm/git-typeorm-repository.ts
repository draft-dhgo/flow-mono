import type { Repository } from 'typeorm';
import { GitRepository } from '../../domain/ports/git-repository.js';
import { Git } from '../../domain/entities/git.js';
import type { GitRow } from './git.schema.js';
import { GitId, GitUrl } from '../../domain/value-objects/index.js';
import { In } from 'typeorm';

export class GitTypeormRepository extends GitRepository {
  constructor(private readonly repo: Repository<GitRow>) {
    super();
  }

  private toDomain(row: GitRow): Git {
    return Git.fromProps({
      id: GitId.create(row.id),
      url: GitUrl.create(row.url),
      localPath: row.local_path,
      version: row.version,
    });
  }

  private toRow(entity: Git): GitRow {
    return {
      id: entity.id as string,
      url: entity.url as string,
      local_path: entity.localPath,
      version: entity.version,
    };
  }

  async findById(id: GitId): Promise<Git | null> {
    const row = await this.repo.findOneBy({ id: id as string });
    return row ? this.toDomain(row) : null;
  }

  async findByUrl(url: GitUrl): Promise<Git | null> {
    const row = await this.repo.findOneBy({ url: url as string });
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Git[]> {
    const rows = await this.repo.find();
    return rows.map((row) => this.toDomain(row));
  }

  async findByIds(ids: GitId[]): Promise<Git[]> {
    if (ids.length === 0) return [];
    const rows = await this.repo.findBy({
      id: In(ids as string[]),
    });
    return rows.map((row) => this.toDomain(row));
  }

  async save(git: Git): Promise<void> {
    const row = this.toRow(git);
    await this.repo.save(row);
  }

  async delete(id: GitId): Promise<void> {
    await this.repo.delete({ id: id as string });
  }

  async exists(id: GitId): Promise<boolean> {
    const count = await this.repo.countBy({ id: id as string });
    return count > 0;
  }
}
