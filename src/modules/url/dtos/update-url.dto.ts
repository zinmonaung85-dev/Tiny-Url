import { IsUrl, IsNotEmpty } from 'class-validator';

export class UpdateUrlDto {
    @IsUrl()
    @IsNotEmpty()
    originalUrl!: string;
}