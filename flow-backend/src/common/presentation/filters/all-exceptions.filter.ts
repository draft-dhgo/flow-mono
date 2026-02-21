import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';

/**
 * 모든 미처리 예외를 캐치하여 안전한 에러 응답만 반환한다.
 * 스택 트레이스 등 내부 정보가 클라이언트에 노출되지 않도록 한다.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json({
        statusCode: status,
        code: 'HTTP_ERROR',
        message: exception.message,
      });
      return;
    }

    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: '서버 내부 오류가 발생했습니다',
    });
  }
}
