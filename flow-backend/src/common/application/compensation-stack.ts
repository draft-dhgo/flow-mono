import { Logger } from '@nestjs/common';

export class CompensationStack {
  private readonly logger = new Logger(CompensationStack.name);
  private readonly actions: Array<() => Promise<void>> = [];

  push(action: () => Promise<void>): void {
    this.actions.push(action);
  }

  async runAll(): Promise<void> {
    for (let i = this.actions.length - 1; i >= 0; i--) {
      try {
        await this.actions[i]();
      } catch (err: unknown) {
        this.logger.error(
          `Compensation action [${i}] failed: ${(err as Error).message}`,
        );
      }
    }
  }

  get size(): number {
    return this.actions.length;
  }
}
