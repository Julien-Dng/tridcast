export const qualityTiers = ["economy", "standard", "advanced", "premium"] as const;
export type QualityTier = (typeof qualityTiers)[number];
export type CreditBucket = "promotional" | "subscription" | "purchased";
export type TransactionType =
  | "subscription_grant" | "purchase" | "promotion" | "reservation"
  | "consumption" | "release" | "refund" | "expiration" | "manual_adjustment";

export interface AiModel {
  id: string;
  name: string;
  qualityTier: QualityTier;
  active: boolean;
  supportedAspectRatios: readonly string[];
  supportedDurations: readonly number[];
  supportedResolutions: readonly string[];
  estimatedProviderCost: number;
  creditCost: number;
}

export interface SubscriptionPlan {
  id: string;
  slug: string;
  maximumQualityTier: QualityTier;
  maximumResolution: string;
  concurrentGenerationLimit: number;
}

export interface GenerationConfiguration {
  aspectRatio: string;
  durationSeconds: number;
  resolution: string;
  sequenceCount: number;
  variants: number;
  voiceCost?: number;
  upscalingCost?: number;
  storageCost?: number;
  compositionCost?: number;
  infrastructureCost?: number;
}

export interface GenerationQuote {
  id: string;
  organizationId: string;
  projectId: string;
  modelId: string;
  configuration: GenerationConfiguration;
  estimatedProviderCost: number;
  requiredCredits: number;
  currency: "EUR";
  expiresAt: Date;
  createdAt: Date;
}
