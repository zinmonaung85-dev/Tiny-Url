import { Global, Module } from '@nestjs/common';
import { createClient } from 'redis';

async function create() {
    const client = createClient({
        url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    });

    client.on('error', (err) => {
        console.error('Redis Error:', err);
    });

    await client.connect();

    console.log('✅ Redis Connected');

    return client;
}

@Global()
@Module({
    providers: [
        {
            provide: 'REDIS_CONN',
            useFactory: create,
        },
    ],
    exports: ['REDIS_CONN'],
})

export class RedisModule { }