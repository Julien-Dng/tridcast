import assert from "node:assert/strict";
import test from "node:test";
import { AccessDeniedError, CreditWallet, IdempotentWebhookProcessor, MockPaymentProvider, PricingConfigurationError, assertModelAccess, assertQuoteValid, calculateQuote } from "../src/index.ts";

const model = { id: "m1", name: "Stable", qualityTier: "standard", active: true, supportedAspectRatios: ["16:9"], supportedDurations: [5], supportedResolutions: ["720p", "1080p"], estimatedProviderCost: 0.01, creditCost: 1 };
const pro = { id: "p1", slug: "pro", maximumQualityTier: "advanced", maximumResolution: "1080p", concurrentGenerationLimit: 3 };
const configuration = { aspectRatio: "16:9", durationSeconds: 5, resolution: "1080p", sequenceCount: 4, variants: 1 };

test("calculates generation cost from actual operations", () => {
  const quote = calculateQuote({ organizationId: "o", projectId: "p", model, configuration, now: new Date(0) });
  assert.equal(quote.estimatedProviderCost, 0.2); assert.equal(quote.requiredCredits, 77);
});
test("rejects a target margin below the minimum", () => {
  assert.throws(() => calculateQuote({ organizationId: "o", projectId: "p", model, configuration, policy: { creditValue: .01, targetGrossMargin: .5, minimumGrossMargin: .6, retryReserveRate: .15, quoteTtlMinutes: 15 } }), PricingConfigurationError);
});
test("restricts model tier, constraints, disabled models, balance and concurrency", () => {
  assert.doesNotThrow(() => assertModelAccess({ model, plan: pro, configuration, availableCredits: 100, requiredCredits: 77, activeGenerations: 2 }));
  assert.throws(() => assertModelAccess({ model: { ...model, active: false }, plan: pro, configuration, availableCredits: 100, requiredCredits: 77, activeGenerations: 0 }), /disabled/);
  assert.throws(() => assertModelAccess({ model, plan: { ...pro, maximumQualityTier: "economy" }, configuration, availableCredits: 100, requiredCredits: 77, activeGenerations: 0 }), AccessDeniedError);
  assert.throws(() => assertModelAccess({ model, plan: pro, configuration, availableCredits: 76, requiredCredits: 77, activeGenerations: 0 }), /Insufficient/);
  assert.throws(() => assertModelAccess({ model, plan: pro, configuration, availableCredits: 100, requiredCredits: 77, activeGenerations: 3 }), /Concurrent/);
});
test("rejects expired server quote", () => {
  const quote = calculateQuote({ organizationId: "o", projectId: "p", model, configuration, now: new Date(0) });
  assert.throws(() => assertQuoteValid(quote, new Date(16 * 60_000)), /expired/);
});
test("reserves atomically and prevents concurrent overspending", async () => {
  const wallet = new CreditWallet({ subscription: 100 });
  const results = await Promise.allSettled([wallet.reserve(70), wallet.reserve(70)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1); assert.equal(wallet.available, 30);
});
test("releases a failed generation into its original buckets", async () => {
  const wallet = new CreditWallet({ promotional: 10, subscription: 20, purchased: 30 });
  const reservation = await wallet.reserve(40); wallet.release(reservation);
  assert.deepEqual(wallet.balance, { promotional: 10, subscription: 20, purchased: 30 });
});
test("expires monthly credits but keeps purchased credits", () => {
  const wallet = new CreditWallet({ subscription: 100, purchased: 50 }); wallet.expireSubscriptionCredits();
  assert.equal(wallet.available, 50); assert.equal(wallet.balance.purchased, 50);
});
test("mock checkout and webhook processing are idempotent", async () => {
  const provider = new MockPaymentProvider();
  const checkout = await provider.createCheckout({ organizationId: "o", credits: 2000, amountCents: 2400, idempotencyKey: "once" });
  assert.deepEqual(await provider.createCheckout({ organizationId: "o", credits: 2000, amountCents: 2400, idempotencyKey: "once" }), checkout);
  const event = await provider.simulate(checkout.id, "credits_purchased"); let grants = 0;
  const processor = new IdempotentWebhookProcessor();
  assert.equal(processor.process(event, () => grants++), true); assert.equal(processor.process(event, () => grants++), false); assert.equal(grants, 1);
});
