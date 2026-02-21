import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export interface JwtPayloadUser {
  userId: string;
  username: string;
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtPayloadUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as JwtPayloadUser;
});
