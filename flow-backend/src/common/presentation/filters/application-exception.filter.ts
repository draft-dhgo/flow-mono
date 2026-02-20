import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ApplicationError } from '../../errors/application-error.js';

@Catch(ApplicationError)
export class ApplicationExceptionFilter implements ExceptionFilter {
  catch(exception: ApplicationError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isNotFound = exception.code.includes('NOT_FOUND');
    const statusCode = isNotFound ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
    const error = isNotFound ? 'Not Found' : 'Bad Request';

    response.status(statusCode).json({
      statusCode,
      error,
      code: exception.code,
      message: exception.message,
    });
  }
}
