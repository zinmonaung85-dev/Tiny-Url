import { IsUrl, IsNotEmpty } from "class-validator";

export class ShortenUrlDto {
    @IsUrl()
    @IsNotEmpty()
    originalUrl!: string;
}