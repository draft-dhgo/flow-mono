import { AggregateRoot } from '@common/aggregate-root.js';
import { GitId } from '../value-objects/index.js';
import type { GitUrl } from '../value-objects/index.js';
import { GitCreated, GitDeleted } from '@common/events/index.js';
import { GitInvariantViolationError } from '../errors/index.js';

export interface GitProps {
  id: GitId;
  url: GitUrl;
  localPath: string;
  version?: number;
}

export interface CreateGitProps {
  url: GitUrl;
  localPath: string;
}

export class Git extends AggregateRoot<GitId> {
  private readonly _id: GitId;
  private readonly _url: GitUrl;
  private readonly _localPath: string;

  private constructor(props: GitProps) {
    super();
    this._id = props.id;
    this._url = props.url;
    this._localPath = props.localPath;
    if (props.version !== undefined) {
      this.setVersion(props.version);
    }
  }

  static create(props: CreateGitProps): Git {
    if (!props.localPath.trim()) {
      throw new GitInvariantViolationError('Local path cannot be empty');
    }

    const id = GitId.generate();
    const git = new Git({
      id,
      url: props.url,
      localPath: props.localPath,
    });

    git.addDomainEvent(
      new GitCreated({
        gitId: id,
        url: props.url,
        localPath: props.localPath,
      })
    );

    return git;
  }

  static fromProps(props: GitProps): Git {
    if (!props.localPath.trim()) {
      throw new GitInvariantViolationError('Local path cannot be empty');
    }
    return new Git(props);
  }

  get id(): GitId {
    return this._id;
  }

  get url(): GitUrl {
    return this._url;
  }

  get localPath(): string {
    return this._localPath;
  }

  delete(): void {
    this.addDomainEvent(
      new GitDeleted({
        gitId: this._id,
      })
    );
  }
}
