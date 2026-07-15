import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Distributed slot locking with Redis (SETNX + TTL), per the design:
 * a short-lived lock is held on a slot during the payment window so the
 * same slot cannot be double-booked while checkout is in flight.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: null,
    });
    this.client.on('connect', () => this.logger.log('Connected to Redis'));
    this.client.on('error', (e) => this.logger.error(`Redis error: ${e.message}`));
  }

  /** Acquire a lock. Returns a token if acquired, or null if already held. */
  async acquireLock(key: string, ttlSeconds: number): Promise<string | null> {
    const token = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const res = await this.client.set(key, token, 'EX', ttlSeconds, 'NX');
    return res === 'OK' ? token : null;
  }

  /** Release a lock only if we still own it (atomic compare-and-delete). */
  async releaseLock(key: string, token: string): Promise<void> {
    const lua = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end`;
    await this.client.eval(lua, 1, key, token);
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }
}
