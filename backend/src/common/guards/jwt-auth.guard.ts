import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guards routes using the 'jwt' Passport strategy
 * (registered in modules/auth/infrastructure/strategies).
 * Structure only.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
