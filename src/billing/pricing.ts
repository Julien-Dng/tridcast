import type { AiModel, GenerationConfiguration, GenerationQuote } from "./types.js";

export interface PricingPolicy {
  creditValue: number;
  targetGrossMargin: number;
  minimumGrossMargin: number;
  retryReserveRate: number;
  quoteTtlMinutes: number;
}

export class PricingConfigurationError extends Error {}

export const defaultPricingPolicy: PricingPolicy = {
  creditValue: 0.01,
  targetGrossMargin: 0.7,
  minimumGrossMargin: 0.6,
  retryReserveRate: 0.15,
  quoteTtlMinutes: 15,
};

export function calculateQuote(input: {
  organizationId: string;
  projectId: string;
  model: AiModel;
  configuration: GenerationConfiguration;
  policy?: PricingPolicy;
  now?: Date;
}): GenerationQuote {
  const policy = input.policy ?? defaultPricingPolicy;
  if (policy.targetGrossMargin < policy.minimumGrossMargin) {
    throw new PricingConfigurationError("Target margin is below the allowed minimum");
  }
  if (policy.targetGrossMargin >= 1 || policy.creditValue <= 0) {
    throw new PricingConfigurationError("Pricing parameters are invalid");
  }
  const config = input.configuration;
  const operations = config.sequenceCount * config.variants;
  const providerCost = input.model.estimatedProviderCost * operations * config.durationSeconds;
  const baseCost = providerCost + (config.storageCost ?? 0) + (config.compositionCost ?? 0)
    + (config.voiceCost ?? 0) + (config.upscalingCost ?? 0) + (config.infrastructureCost ?? 0);
  const internalCost = baseCost * (1 + policy.retryReserveRate);
  const customerPrice = internalCost / (1 - policy.targetGrossMargin);
  const requiredCredits = Math.max(input.model.creditCost * operations, Math.ceil(customerPrice / policy.creditValue));
  const actualMargin = (requiredCredits * policy.creditValue - internalCost) / (requiredCredits * policy.creditValue);
  if (actualMargin + Number.EPSILON < policy.minimumGrossMargin) {
    throw new PricingConfigurationError("Calculated margin is below the allowed minimum");
  }
  const now = input.now ?? new Date();
  return {
    id: crypto.randomUUID(), organizationId: input.organizationId, projectId: input.projectId,
    modelId: input.model.id, configuration: config, estimatedProviderCost: providerCost,
    requiredCredits, currency: "EUR", createdAt: now,
    expiresAt: new Date(now.getTime() + policy.quoteTtlMinutes * 60_000),
  };
}

export function assertQuoteValid(quote: GenerationQuote, now = new Date()): void {
  if (quote.expiresAt.getTime() <= now.getTime()) throw new Error("Generation quote has expired");
}
