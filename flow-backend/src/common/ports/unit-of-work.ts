export abstract class UnitOfWork {
  abstract run<T>(work: () => Promise<T>): Promise<T>;
}
