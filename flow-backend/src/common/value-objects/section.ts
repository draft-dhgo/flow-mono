import { DomainError } from '../errors/index.js';

export class Section {
  private readonly _title: string;
  private readonly _description: string;

  private constructor(title: string, description: string) {
    this._title = title;
    this._description = description;
  }

  static create(title: string, description: string): Section {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    if (!trimmedTitle) {
      throw new DomainError('INVARIANT_VIOLATION', 'Section title cannot be empty');
    }
    if (!trimmedDesc) {
      throw new DomainError('INVARIANT_VIOLATION', 'Section description cannot be empty');
    }
    return new Section(trimmedTitle, trimmedDesc);
  }

  static fromProps(title: string, description: string): Section {
    if (!title.trim()) {
      throw new DomainError('INVARIANT_VIOLATION', 'Section title cannot be empty');
    }
    if (!description.trim()) {
      throw new DomainError('INVARIANT_VIOLATION', 'Section description cannot be empty');
    }
    return new Section(title, description);
  }

  get title(): string {
    return this._title;
  }

  get description(): string {
    return this._description;
  }

  equals(other: Section): boolean {
    return this._title === other._title && this._description === other._description;
  }
}
