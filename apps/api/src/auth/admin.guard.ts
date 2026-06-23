import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtPayload } from './jwt.guard';

/** Use AFTER JwtAuthGuard. Allows only ADMIN users through. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user: JwtPayload | undefined = ctx.switchToHttp().getRequest().user;
    if (user?.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required.');
    }
    return true;
  }
}
