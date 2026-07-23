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

    constructor(partial?: Partial<UrlDto>) {
        if (partial) {
            Object.assign(this, partial);
        }
    }

    toPlain() {
        return {
            id: this.id,
            userId: this.userId,
            createdAt: this.createdAt,
        };
    }
}