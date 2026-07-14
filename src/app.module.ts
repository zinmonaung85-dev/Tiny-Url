import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UrlModule } from './modules/url/url.module';
import { HashingModule } from './modules/hashing/hashing.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UrlModule,
    HashingModule

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }