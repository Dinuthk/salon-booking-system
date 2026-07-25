import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      // Coerce numeric strings from forms ("500" -> 500) so clients aren't
      // forced to pre-convert every field.
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const port = process.env.PORT || 3002;
  await app.listen(port);
  Logger.log(`Catalogue service listening on :${port}`, 'Bootstrap');
}
bootstrap();
