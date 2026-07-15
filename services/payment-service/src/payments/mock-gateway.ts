import { Injectable, Logger } from '@nestjs/common';

export interface ChargeResult {
  success: boolean;
  ref?: string;
  reason?: string;
}

/**
 * Stands in for Stripe / PayHere. In mock mode it tokenizes and "charges"
 * without touching a real gateway — card data never reaches our services.
 * Swap this out for the real SDK + webhooks in production.
 */
@Injectable()
export class MockGateway {
  private readonly logger = new Logger(MockGateway.name);
  private readonly mock = (process.env.PAYMENT_MOCK || 'true') === 'true';

  async charge(amount: number, currency: string, simulateFailure = false): Promise<ChargeResult> {
    if (!this.mock) {
      // Real integration would call the gateway SDK here.
      throw new Error('Real payment gateway not configured (set PAYMENT_MOCK=true for dev)');
    }
    await new Promise((r) => setTimeout(r, 300)); // simulate network latency
    if (simulateFailure) {
      return { success: false, reason: 'Card declined (simulated)' };
    }
    const ref = `mock_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    this.logger.log(`Charged ${amount} ${currency} -> ${ref}`);
    return { success: true, ref };
  }

  async refund(gatewayRef: string, amount: number): Promise<ChargeResult> {
    if (!this.mock) throw new Error('Real payment gateway not configured');
    await new Promise((r) => setTimeout(r, 200));
    const ref = `refund_${gatewayRef}`;
    this.logger.log(`Refunded ${amount} for ${gatewayRef} -> ${ref}`);
    return { success: true, ref };
  }
}
