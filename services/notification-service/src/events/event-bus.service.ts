import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as amqp from 'amqplib';

/**
 * Thin wrapper over RabbitMQ (amqplib) implementing a durable topic exchange.
 * Domain events are published with routing keys like `salon.upserted`.
 * Consumers bind a durable queue to one or more routing-key patterns.
 */
@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private connection: any; // amqp ChannelModel — concrete type varies across amqplib versions
  private channel: amqp.Channel;
  private readonly exchange = process.env.RABBITMQ_EXCHANGE || 'salon.events';

  private readyResolve!: () => void;
  /** Resolves once the channel + exchange are established. */
  readonly ready: Promise<void> = new Promise((res) => (this.readyResolve = res));

  async onModuleInit() {
    await this.connectWithRetry();
  }

  private async connectWithRetry(attempt = 1): Promise<void> {
    const url = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`;
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      this.logger.log(`Connected to RabbitMQ exchange "${this.exchange}"`);
      this.readyResolve();
      this.connection.on('error', (err) => this.logger.error(`AMQP error: ${err.message}`));
      this.connection.on('close', () => {
        this.logger.warn('AMQP connection closed, reconnecting...');
        setTimeout(() => this.connectWithRetry(), 3000);
      });
    } catch (err) {
      if (attempt >= 20) throw err;
      this.logger.warn(`RabbitMQ not ready (attempt ${attempt}), retrying in 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
      return this.connectWithRetry(attempt + 1);
    }
  }

  publish(routingKey: string, payload: unknown): void {
    if (!this.channel) {
      this.logger.error(`Cannot publish "${routingKey}" — channel not ready`);
      return;
    }
    this.channel.publish(
      this.exchange,
      routingKey,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true, contentType: 'application/json' },
    );
    this.logger.debug(`Published ${routingKey}`);
  }

  /**
   * Bind a durable queue to routing-key patterns and consume messages.
   * The handler receives the parsed JSON payload. Ack on success; on error
   * the message is dead-lettered (nack, no requeue) to avoid poison loops.
   */
  async subscribe(
    queue: string,
    patterns: string[],
    handler: (routingKey: string, payload: any) => Promise<void> | void,
  ): Promise<void> {
    await this.ready;
    const dlx = `${this.exchange}.dlx`;
    await this.channel.assertExchange(dlx, 'topic', { durable: true });
    await this.channel.assertQueue(queue, {
      durable: true,
      deadLetterExchange: dlx,
    });
    for (const p of patterns) {
      await this.channel.bindQueue(queue, this.exchange, p);
    }
    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        await handler(msg.fields.routingKey, payload);
        this.channel.ack(msg);
      } catch (err) {
        this.logger.error(`Handler failed for ${msg.fields.routingKey}: ${err}`);
        this.channel.nack(msg, false, false);
      }
    });
    this.logger.log(`Subscribed "${queue}" to [${patterns.join(', ')}]`);
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch {
      /* ignore */
    }
  }
}
