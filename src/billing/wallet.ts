import type { CreditBucket, TransactionType } from "./types.js";

export interface CreditTransaction { id: string; type: TransactionType; amount: number; balanceAfter: number; createdAt: Date; metadata: Readonly<Record<string, unknown>> }
export interface WalletBalance { promotional: number; subscription: number; purchased: number }

export class CreditWallet {
  readonly transactions: CreditTransaction[] = [];
  readonly balance: WalletBalance;
  #reserved = new Map<string, WalletBalance>();
  #queue: Promise<void> = Promise.resolve();

  constructor(initial: Partial<WalletBalance> = {}) {
    this.balance = { promotional: initial.promotional ?? 0, subscription: initial.subscription ?? 0, purchased: initial.purchased ?? 0 };
  }
  get available(): number { return this.balance.promotional + this.balance.subscription + this.balance.purchased; }
  grant(bucket: CreditBucket, amount: number, type: TransactionType): void {
    if (amount <= 0) throw new Error("Grant must be positive");
    this.balance[bucket] += amount;
    this.record(type, amount, { bucket });
  }
  reserve(amount: number): Promise<string> {
    return this.atomic(async () => {
      if (!Number.isInteger(amount) || amount <= 0) throw new Error("Reservation must be a positive integer");
      if (this.available < amount) throw new Error("Insufficient credits");
      const allocation: WalletBalance = { promotional: 0, subscription: 0, purchased: 0 };
      let remaining = amount;
      for (const bucket of ["promotional", "subscription", "purchased"] as const) {
        const used = Math.min(this.balance[bucket], remaining);
        this.balance[bucket] -= used; allocation[bucket] = used; remaining -= used;
      }
      const id = crypto.randomUUID(); this.#reserved.set(id, allocation);
      this.record("reservation", -amount, { reservationId: id, allocation });
      return id;
    });
  }
  consume(reservationId: string): void {
    const allocation = this.takeReservation(reservationId);
    this.record("consumption", 0, { reservationId, allocation });
  }
  release(reservationId: string): void {
    const allocation = this.takeReservation(reservationId);
    for (const bucket of Object.keys(allocation) as CreditBucket[]) this.balance[bucket] += allocation[bucket];
    this.record("release", this.sum(allocation), { reservationId, allocation });
  }
  expireSubscriptionCredits(): void {
    const amount = this.balance.subscription;
    this.balance.subscription = 0;
    if (amount) this.record("expiration", -amount, { bucket: "subscription" });
  }
  private takeReservation(id: string): WalletBalance {
    const allocation = this.#reserved.get(id);
    if (!allocation) throw new Error("Unknown or finalized reservation");
    this.#reserved.delete(id); return allocation;
  }
  private sum(value: WalletBalance): number { return value.promotional + value.subscription + value.purchased; }
  private record(type: TransactionType, amount: number, metadata: Record<string, unknown>): void {
    this.transactions.push(Object.freeze({ id: crypto.randomUUID(), type, amount, balanceAfter: this.available, createdAt: new Date(), metadata: Object.freeze(metadata) }));
  }
  private atomic<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#queue.then(operation, operation);
    this.#queue = result.then(() => undefined, () => undefined);
    return result;
  }
}
