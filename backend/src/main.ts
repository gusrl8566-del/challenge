import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontendOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((url) => url.trim())
    .filter((url) => Boolean(url));

  app.enableCors({
    origin: (origin, callback) => {
      // Allow same-origin requests and configured frontend origins.
      if (!origin || frontendOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy blocked this origin'), false);
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
