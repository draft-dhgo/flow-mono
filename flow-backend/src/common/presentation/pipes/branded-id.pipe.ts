import type { PipeTransform } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../errors/index.js';
import type { IdFactory } from '../../ids/shared-ids.js';

export class InvalidIdError extends ApplicationError {
  constructor(value: string, idName: string) {
    super('INVALID_ID', `Invalid ${idName}: "${value}" is not a valid UUID`);
  }
}

@Injectable()
export class BrandedIdPipe<T> implements PipeTransform<string, T> {
  constructor(
    private readonly factory: IdFactory<T>,
    private readonly idName: string,
  ) {}

  transform(value: string): T {
    if (!this.factory.isValid(value)) {
      throw new InvalidIdError(value, this.idName);
    }
    return this.factory.create(value);
  }
}
