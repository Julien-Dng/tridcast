import { z } from "zod";

export const roomTypes = ["exterior_front","exterior_back","entrance","hallway","living_room","dining_room","kitchen","bedroom","bathroom","office","stairs","balcony","terrace","garden","garage","other"] as const;
export const generationStrategies = ["continuous", "segmented"] as const;
export const segmentStatuses = ["pending","queued","processing","completed","failed","cancelled"] as const;

const safeInstruction = z.string().trim().min(1).max(500).refine(value => !/[<>]/.test(value), "Les balises HTML ne sont pas autorisées");
export const realEstateMediaMetadataSchema = z.object({
  roomType: z.enum(roomTypes), floor: z.number().int().min(-10).max(200).optional(),
  position: z.number().int().positive(), isStartingImage: z.boolean(), transitionInstruction: safeInstruction.optional(),
});
export type RealEstateMediaMetadata = z.infer<typeof realEstateMediaMetadataSchema>;
export type WalkthroughMedia = { id:string; storageKey:string; organizationId:string; metadata:RealEstateMediaMetadata };
export type GeneratedPrompt = { prompt:string; negativePrompt:string; metadata:{version:number;strategy:"continuous"|"segmented";referencedMediaIds:string[];sourceRoom?:string;destinationRoom?:string} };

export const NEGATIVE_PROMPT = "Cuts, jump cuts, scene changes, teleportation, morphing transitions, crossfades, dissolves, duplicated rooms, invented rooms, added corridors, added doors, added windows, added furniture, missing furniture, redesigned architecture, changed room layout, altered decor, incorrect colors, inconsistent materials, changing lighting, warped walls, bending lines, distorted geometry, moving objects, floating furniture, impossible spatial connections, camera passing through walls, camera passing through furniture, drone movement, floating camera, excessive camera rotation, fisheye distortion, extreme wide angle, zoom effects, abrupt acceleration, camera shake, flickering, visual artifacts, people, animals, text, captions, logos, watermarks.";
const labels:Record<(typeof roomTypes)[number],string>={exterior_front:"Exterior front",exterior_back:"Exterior back",entrance:"Main entrance",hallway:"Hallway",living_room:"Living room",dining_room:"Dining room",kitchen:"Kitchen",bedroom:"Bedroom",bathroom:"Bathroom",office:"Office",stairs:"Stairs",balcony:"Balcony",terrace:"Terrace",garden:"Garden",garage:"Garage",other:"Other space"};
export function orderedRoute(media:WalkthroughMedia[]){return [...media].sort((a,b)=>a.metadata.position-b.metadata.position)}
const continuousTemplate=`Using all provided property photos as visual references, generate a photorealistic, continuous first-person real estate walkthrough.

Follow the reference images in the exact order provided:

{{ORDERED_ROUTE}}

Begin at {{STARTING_LOCATION}} and continue through the visible rooms and connecting spaces in the specified sequence.

Move at a slow, steady walking pace, as if filmed by a professional real estate videographer using a stabilized gimbal. Use realistic forward motion, gentle turns, natural doorway transitions, accurate depth, and consistent parallax.

Preserve the property exactly as shown in the reference images, including its architecture, structural proportions, room dimensions, layouts, doors, windows, walls, ceilings, openings, furniture placement, decorations, colors, materials, textures, finishes, and lighting.

Maintain consistent spatial relationships between consecutive reference images. Treat every reference image as a fixed visual constraint, not as general creative inspiration.

When a connection between two spaces is not clearly visible, create only the shortest plausible neutral transition. Do not invent additional rooms, doors, windows, corridors, staircases, furniture, architectural features, exterior views, or decorations.

The camera must remain at a realistic human eye level. Keep the movement grounded and physically plausible. Move naturally through hallways, around corners, through visible doorways, and between rooms without crossing walls, furniture, or solid objects.

Follow these user-provided transition instructions whenever they are compatible with the visible references:

{{TRANSITION_INSTRUCTIONS}}

Prioritize, in this order:

1. visual fidelity to the reference photos;
2. preservation of the property’s architecture and contents;
3. spatial and temporal consistency;
4. realistic camera navigation;
5. smoothness and visual quality.

Create a bright, inviting, premium real estate presentation with photorealistic detail, realistic perspective, stable geometry, natural depth, and subtle cinematic polish.

The final result should feel like physically walking through the real property in one seamless tour.`;
const segmentTemplate=`Create a photorealistic, continuous first-person real estate camera movement from the source reference image to the destination reference image.

Source space: {{SOURCE_ROOM}}
Destination space: {{DESTINATION_ROOM}}

Movement instruction:

{{TRANSITION_INSTRUCTION}}

Begin with the exact architecture, furniture, decor, colors, materials, lighting, perspective, and visual details shown in the source image. Move slowly and naturally toward the destination space.

End with a composition that matches the destination reference image as closely as possible.

Treat both images as fixed visual constraints. Preserve all visible architectural and decorative details. Maintain realistic scale, depth, parallax, and spatial relationships.

If the physical connection is not completely visible, use the shortest plausible neutral movement. Do not invent additional rooms, doors, windows, corridors, staircases, furniture, decorations, exterior views, or architectural features.

The camera must remain at a realistic human eye level and move like a professional real estate videographer using a stabilized gimbal.

Prioritize visual fidelity and physical plausibility over dramatic cinematic effects. Use steady forward movement, gentle turns, stable geometry, and a bright, inviting, photorealistic real estate style.`;

export interface RealEstatePromptBuilder { buildContinuousPrompt(input:{media:WalkthroughMedia[]}):GeneratedPrompt; buildSegmentPrompt(input:{source:WalkthroughMedia;destination:WalkthroughMedia;transitionInstruction?:string}):GeneratedPrompt }
export class VersionedRealEstatePromptBuilder implements RealEstatePromptBuilder {
  buildContinuousPrompt({media}:{media:WalkthroughMedia[]}):GeneratedPrompt { const route=orderedRoute(media); const start=route.find(x=>x.metadata.isStartingImage); if(!start)throw new Error("Photo de départ manquante"); const instructions=route.map(x=>x.metadata.transitionInstruction).filter(Boolean).map((x,i)=>`${i+1}. ${safeInstruction.parse(x)}`).join("\n")||"No additional user instruction."; const prompt=continuousTemplate.replace("{{ORDERED_ROUTE}}",route.map((x,i)=>`${i+1}. ${labels[x.metadata.roomType]}`).join("\n")).replace("{{STARTING_LOCATION}}",labels[start.metadata.roomType]).replace("{{TRANSITION_INSTRUCTIONS}}",instructions); return {prompt,negativePrompt:NEGATIVE_PROMPT,metadata:{version:1,strategy:"continuous",referencedMediaIds:route.map(x=>x.id)}} }
  buildSegmentPrompt({source,destination,transitionInstruction}:{source:WalkthroughMedia;destination:WalkthroughMedia;transitionInstruction?:string}):GeneratedPrompt { const instruction=transitionInstruction?safeInstruction.parse(transitionInstruction):"Use the shortest plausible neutral movement between the visible spaces."; const prompt=segmentTemplate.replace("{{SOURCE_ROOM}}",labels[source.metadata.roomType]).replace("{{DESTINATION_ROOM}}",labels[destination.metadata.roomType]).replace("{{TRANSITION_INSTRUCTION}}",instruction); return {prompt,negativePrompt:NEGATIVE_PROMPT,metadata:{version:1,strategy:"segmented",referencedMediaIds:[source.id,destination.id],sourceRoom:source.metadata.roomType,destinationRoom:destination.metadata.roomType}} }
}

export type ReplicateModelConfiguration={modelId:string;version?:string;qualityTier:"economy"|"standard"|"advanced"|"premium";supportsMultipleImages:boolean;supportsStartImage:boolean;supportsEndImage:boolean;supportsNegativePrompt:boolean;supportedDurations:number[];supportedAspectRatios:string[];supportedResolutions:string[];pricingMode:"per_generation"|"per_second";estimatedCost:number;inputMapping:Record<string,string>;maxImages?:number;active?:boolean};
export type WalkthroughRenderPlan={version:1;vertical:"real_estate";contentType:"property_walkthrough";generationStrategy:"continuous"|"segmented";aspectRatio:string;segments:WalkthroughSegment[];composition:{logoEnabled:boolean;textOverlayEnabled:boolean;musicEnabled:boolean;voiceOverEnabled:boolean}};
export type WalkthroughSegment={id:string;position:number;sourceMediaId:string;destinationMediaId:string;sourceRoom:string;destinationRoom:string;durationSeconds:number;transitionInstruction?:string;promptVersion:"real-estate-segment-v1";generationJobId:null|string;status:(typeof segmentStatuses)[number]};
export function buildWalkthroughRenderPlan(media:WalkthroughMedia[],strategy:"continuous"|"segmented",aspectRatio:string,durationSeconds:number):WalkthroughRenderPlan { const route=orderedRoute(media); const segments=strategy==="segmented"?route.slice(0,-1).map((source,i)=>({id:`segment-${i+1}`,position:i+1,sourceMediaId:source.id,destinationMediaId:route[i+1]!.id,sourceRoom:source.metadata.roomType,destinationRoom:route[i+1]!.metadata.roomType,durationSeconds,transitionInstruction:source.metadata.transitionInstruction,promptVersion:"real-estate-segment-v1" as const,generationJobId:null,status:"pending" as const})):[]; return {version:1,vertical:"real_estate",contentType:"property_walkthrough",generationStrategy:strategy,aspectRatio,segments,composition:{logoEnabled:false,textOverlayEnabled:false,musicEnabled:false,voiceOverEnabled:false}} }

export function validateWalkthrough(input:{media:WalkthroughMedia[];organizationId:string;strategy:"continuous"|"segmented";model:ReplicateModelConfiguration;aspectRatio:string;durationSeconds:number;resolution:string;availableCredits?:number;requiredCredits?:number}) { const errors:string[]=[];const warnings:string[]=[];let route:WalkthroughMedia[]=[]; try{route=orderedRoute(input.media.map(x=>({...x,metadata:realEstateMediaMetadataSchema.parse(x.metadata)})))}catch{errors.push("Métadonnées de média invalides")}; if(route.length<2)errors.push("Au moins deux photos sont nécessaires"); if(route.filter(x=>x.metadata.isStartingImage).length!==1)errors.push("Une seule photo de départ est requise"); const positions=route.map(x=>x.metadata.position);if(new Set(positions).size!==positions.length||positions.some((p,i)=>p!==i+1))errors.push("Les positions doivent être uniques et continues à partir de 1"); if(route.some(x=>!x.storageKey))errors.push("Une photo est inaccessible dans le stockage");if(route.some(x=>x.organizationId!==input.organizationId))errors.push("Accès interdit à un média d’une autre organisation");if(input.model.active===false)errors.push("Le modèle est désactivé");if(input.strategy==="continuous"&&!input.model.supportsMultipleImages)errors.push("Ce modèle ne prend pas en charge plusieurs images. Utilisez la visite par séquences.");if(input.model.maxImages&&route.length>input.model.maxImages)errors.push("Nombre maximal d’images dépassé");if(!input.model.supportedAspectRatios.includes(input.aspectRatio))errors.push("Format incompatible avec le modèle");if(!input.model.supportedDurations.includes(input.durationSeconds))errors.push("Durée incompatible avec le modèle");if(!input.model.supportedResolutions.includes(input.resolution))errors.push("Résolution incompatible avec le modèle");if((input.availableCredits??Infinity)<(input.requiredCredits??0))errors.push("Solde de crédits insuffisant");if(!route.some(x=>x.metadata.roomType.startsWith("exterior")))warnings.push("Aucune photo extérieure n’est fournie");if(new Set(route.map(x=>x.metadata.roomType)).size<route.length)warnings.push("Plusieurs photos ont le même type de pièce");if(!route.some(x=>x.metadata.transitionInstruction))warnings.push("Aucune instruction de transition n’est fournie");if(route.length>10)warnings.push("Le nombre de photos implique un coût élevé");if(input.strategy==="continuous")warnings.push("La visite continue est expérimentale et ne garantit pas une reconstruction exacte");return {valid:errors.length===0,errors,warnings,route}; }
