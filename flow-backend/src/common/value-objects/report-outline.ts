import { Section } from './section.js';
import { DomainError } from '../errors/index.js';

export class ReportOutline {
  private readonly _sections: readonly Section[];

  private constructor(sections: Section[]) {
    this._sections = Object.freeze([...sections]);
  }

  static create(sections: Section[]): ReportOutline {
    if (sections.length === 0) {
      throw new DomainError('INVARIANT_VIOLATION', 'Report outline must have at least one section');
    }
    return new ReportOutline(sections);
  }

  static fromProps(sections: Section[]): ReportOutline {
    if (sections.length === 0) {
      throw new DomainError('INVARIANT_VIOLATION', 'Report outline must have at least one section');
    }
    return new ReportOutline(sections);
  }

  get sections(): readonly Section[] {
    return this._sections;
  }

  addSection(section: Section): ReportOutline {
    return new ReportOutline([...this._sections, section]);
  }

  removeSection(index: number): ReportOutline {
    if (index < 0 || index >= this._sections.length) {
      throw new DomainError('INVARIANT_VIOLATION', `Section index out of bounds: ${index}`);
    }
    const newSections = [...this._sections];
    newSections.splice(index, 1);
    if (newSections.length === 0) {
      throw new DomainError('INVARIANT_VIOLATION', 'Cannot remove last section from report outline');
    }
    return new ReportOutline(newSections);
  }
}
