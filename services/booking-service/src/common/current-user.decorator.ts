import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export interface GatewayUser {
  id: string;
  role: string;
  name?: string;
  email?: string;
}

/**
 * Reads the trusted user identity injected by the API Gateway after it
 * validates the JWT (`x-user-id`, `x-user-role`, `x-user-email`).
 * Services sit on the internal network and trust these headers.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): GatewayUser => {
    const req = ctx.switchToHttp().getRequest();
    const id = req.headers['x-user-id'];
    if (!id) throw new UnauthorizedException('Missing authenticated user');
    const rawName = req.headers['x-user-name'];
    return {
      id,
      role: req.headers['x-user-role'] || 'customer',
      email: req.headers['x-user-email'],
      name: rawName ? decodeURIComponent(rawName) : undefined,
    };
  },
);
