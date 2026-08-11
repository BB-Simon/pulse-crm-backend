import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

/**
 * The request pipeline shared by the real server (main.ts) and e2e tests, so
 * tests exercise the exact same prefixing/validation/error-handling behavior
 * as production instead of a bare, unconfigured Nest app.
 */
export function configureApp(app: INestApplication): void {
  // /public/v1/* is a separate API surface (API-key auth, not user JWT) and
  // stays unprefixed — controllers there declare their full path themselves.
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'public/v1/*path', method: RequestMethod.ALL }],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
}
