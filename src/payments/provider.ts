export type MockPaymentScenario = "accepted" | "declined" | "renewed" | "cancelled" | "upgraded" | "payment_failed" | "credits_purchased";
export interface CheckoutRequest { organizationId: string; credits: number; amountCents: number; idempotencyKey: string }
export interface CheckoutResult { id: string; status: "pending" | "paid" | "failed"; checkoutUrl: string }
export interface PaymentProvider { createCheckout(request: CheckoutRequest): Promise<CheckoutResult>; simulate?(id: string, scenario: MockPaymentScenario): Promise<PaymentEvent> }
export interface PaymentEvent { externalEventId: string; eventType: MockPaymentScenario; checkoutId: string }

export class MockPaymentProvider implements PaymentProvider {
  #checkouts = new Map<string, CheckoutResult>();
  #events = new Map<string, PaymentEvent>();
  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const existing = this.#checkouts.get(request.idempotencyKey);
    if (existing) return existing;
    const result = { id: crypto.randomUUID(), status: "pending" as const, checkoutUrl: `mock://checkout/${request.idempotencyKey}` };
    this.#checkouts.set(request.idempotencyKey, result); return result;
  }
  async simulate(id: string, scenario: MockPaymentScenario): Promise<PaymentEvent> {
    const key = `${id}:${scenario}`;
    const existing = this.#events.get(key); if (existing) return existing;
    const event = { externalEventId: crypto.randomUUID(), eventType: scenario, checkoutId: id };
    this.#events.set(key, event); return event;
  }
}

export class IdempotentWebhookProcessor {
  #processed = new Set<string>();
  process(event: PaymentEvent, handler: (event: PaymentEvent) => void): boolean {
    if (this.#processed.has(event.externalEventId)) return false;
    handler(event); this.#processed.add(event.externalEventId); return true;
  }
}
