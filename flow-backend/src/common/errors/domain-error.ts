export class DomainError extends Error {
  readonly code: string;
  readonly isTransient: boolean;

  constructor(code: string, message: string, isTransient: boolean = false) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.isTransient = isTransient;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
