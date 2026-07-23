import { Module } from '@nestjs/common';
import { HashingModule } from '../../modules/hashing/hashing.module';
import { RedisService } from './redis.service';
import { UrlController } from './url.controller';
import { UrlRepository } from './url.repository';
import { UrlService } from './url.service';
import { URL_REPOSITORY } from './repository.interface';
import { CachedURLRepositoryDecorator } from './cached-url-repository.decorator';

@Module({
  imports: [HashingModule],
  controllers: [UrlController],
  providers: [
    UrlService,
    UrlRepository,
    RedisService,
    { provide: URL_REPOSITORY, useClass: CachedURLRepositoryDecorator },
  ],
  exports: [],
})
export class UrlModule { }