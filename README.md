# Tridcast

MVP SaaS français de génération de vidéos immobilières. Next.js App Router fournit l'interface responsive, PostgreSQL/Neon et Drizzle conservent les projets, Zod valide les entrées, et les fournisseurs vidéo/composition restent interchangeables. Le mode `VIDEO_PROVIDER=mock` n'appelle aucun service payant.

## Installation

Prérequis : Node.js 22+, npm et, pour la persistance, une base PostgreSQL Neon.

```bash
cp .env.example .env.local
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Ouvrir http://localhost:3000. Le parcours visuel de démonstration fonctionne sans Neon ; les opérations persistantes nécessitent `DATABASE_URL`.

## Commandes

- `npm run dev` : serveur de développement ;
- `npm run build` : build de production ;
- `npm run lint` : contrôle TypeScript ;
- `npm test` : tests Vitest ;
- `npm run test:e2e` : parcours Playwright ;
- `npm run db:generate`, `db:migrate`, `db:seed` : cycle Drizzle/Neon.

## Architecture

- `src/domain` : définition verticale configurable, validation et plan de rendu indépendant ;
- `src/db` et `drizzle/` : schéma Drizzle, migration et seed ;
- `src/server/providers` : contrats Mock/Replicate, seuls points d'accès au fournisseur ;
- `src/server/composer` : composition séparée de la génération IA ;
- `src/server/auth` et `storage` : session HTTP-only, isolation organisationnelle et règles médias ;
- `src/app` : pages App Router en français.

Le pipeline conserve séparément `inputData`, `renderPlan`, les `generationJobs` et l'output. Une génération passe par `queued`, `processing`, puis `composing` avant `completed`.

### Visites immobilières multi-photos

Le parcours `property_walkthrough` ordonne les médias et leurs métadonnées de pièce, recommande la stratégie segmentée et conserve un prompt `real-estate-segment-v1` par séquence. La stratégie continue reste expérimentale et est refusée lorsque la configuration du modèle n'annonce pas `supportsMultipleImages`. La génération IA de chaque segment et la composition finale sont deux étapes distinctes ; une séquence en échec peut être relancée sans perdre les sorties déjà stockées.

Les modèles sont décrits côté serveur par leurs capacités, coûts et `inputMapping`. Les URL envoyées au fournisseur doivent être des URL S3 signées à courte durée de vie créées côté serveur, jamais des URL internes reçues du navigateur. Pour une intégration réelle, configurer le modèle, sa version, ses champs d'entrée, ses durées/formats/résolutions et vérifier que les champs start/end image correspondent bien à son schéma Replicate.

## Neon, stockage et Replicate

Créer un projet Neon, copier l'URL avec SSL dans `DATABASE_URL`, puis appliquer la migration. En production, utiliser un stockage S3 compatible et ne distribuer que des URL signées courtes ; les fichiers acceptés sont JPEG, PNG et WebP, 10 Mo maximum et 20 médias par projet.

Pour Replicate, choisir `VIDEO_PROVIDER=replicate`, renseigner token, modèle/version et secret webhook. Exposer en développement `/api/webhooks/replicate` via un tunnel HTTPS. Les identifiants modèle sont de la configuration et non du domaine. Le webhook doit être vérifié avec `REPLICATE_WEBHOOK_SECRET` et son identifiant unique assure l'idempotence. Aucun secret ne porte le préfixe `NEXT_PUBLIC_`.

## Limites du MVP

Le compositeur et le stockage sont des ports de développement : le résultat vidéo mock est simulé. Une implémentation FFmpeg/Remotion (normalisation, assemblage et overlays) et un adaptateur S3 signant réellement les requêtes sont nécessaires en production. La capacité multi-images ne garantit jamais une reconstruction architecturale exacte. Le paiement n'est volontairement pas raccordé ; le compte de crédits prépare cette évolution.
