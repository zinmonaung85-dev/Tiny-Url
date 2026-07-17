import { PartialType } from '@nestjs/swagger';
import { ShortenUrlDto } from './shorten-url.dto';

export class UpdateUrlDto extends PartialType(ShortenUrlDto) { }