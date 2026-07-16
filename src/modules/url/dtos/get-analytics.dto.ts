import { IsOptional, IsDateString } from "class-validator";

export class GetAnalyticsDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}