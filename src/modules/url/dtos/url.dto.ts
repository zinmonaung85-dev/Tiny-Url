export class UrlDto {
    id!: string;
    userId!: string;
    shortCode!: string;
    originalUrl!: string;
    expiresAt?: Date | null;
    clickCount!: number;
    createdAt!: Date;
    updatedAt!: Date;
    deletedAt?: Date | null;

    constructor(partial: Partial<UrlDto>) {
        Object.assign(this, partial);
    }
}