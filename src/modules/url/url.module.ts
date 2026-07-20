import { Module } from '@nestjs/common';
import { UrlService } from './url.service';
import { UrlRepository } from './url.repository';
import { UrlController } from './url.controller';
import { HashingModule } from '../../modules/hashing/hashing.module';

@Module({
  imports: [
    HashingModule
  ],
  controllers: [UrlController],
  providers: [
    UrlService,
    UrlRepository
  ],
  exports: [UrlService]
})
export class UrlModule { }