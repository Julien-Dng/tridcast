import { qualityTiers, type AiModel, type GenerationConfiguration, type SubscriptionPlan } from "./types.js";

export class AccessDeniedError extends Error {}

export function assertModelAccess(input: {
  model: AiModel;
  plan: SubscriptionPlan;
  configuration: GenerationConfiguration;
  availableCredits: number;
  requiredCredits: number;
  activeGenerations: number;
}): void {
  const { model, plan, configuration } = input;
  if (!model.active) throw new AccessDeniedError("Model is disabled");
  if (qualityTiers.indexOf(model.qualityTier) > qualityTiers.indexOf(plan.maximumQualityTier))
    throw new AccessDeniedError(`Plan ${plan.slug} does not include ${model.qualityTier} models`);
  if (!model.supportedAspectRatios.includes(configuration.aspectRatio)) throw new AccessDeniedError("Unsupported aspect ratio");
  if (!model.supportedDurations.includes(configuration.durationSeconds)) throw new AccessDeniedError("Unsupported duration");
  if (!model.supportedResolutions.includes(configuration.resolution)) throw new AccessDeniedError("Unsupported resolution");
  if (input.availableCredits < input.requiredCredits) throw new AccessDeniedError("Insufficient credits");
  if (input.activeGenerations >= plan.concurrentGenerationLimit) throw new AccessDeniedError("Concurrent generation limit reached");
}
