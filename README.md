# Tridcast

Socle du domaine commercial de Tridcast : catalogue IA et abonnements, estimation
côté serveur, contrôle d'accès, portefeuille à écritures immuables et abstraction
de paiement. Les prix et règles sont stockés dans PostgreSQL ou fournis par
l'environnement ; l'interface cliente ne décide jamais du montant facturé.

## Prérequis et commandes

- Node.js 22 ou supérieur ;
- PostgreSQL/Neon pour appliquer `src/db/migrations/001_billing.sql`.

```sh
npm install
npm run dev    # exécute le point d'entrée TypeScript en mode watch
npm test       # tests métier avec node:test
npm run lint   # vérification TypeScript stricte
npm run build  # compilation dans dist/
```

Copier `.env.example` vers `.env`. Par défaut, utiliser `PAYMENT_PROVIDER=mock`
et `VIDEO_PROVIDER=mock` : aucun paiement ou appel vidéo réel n'est alors émis.
Le mock simule acceptation, refus, renouvellement, annulation, upgrade, échec de
prélèvement et achat de crédits. Le mode Stripe exige les secrets et identifiants
de prix listés dans le fichier d'exemple.

## Garanties commerciales

- Une estimation expirante est calculée à partir des opérations réellement
  nécessaires, d'une réserve de retry et de la marge configurée.
- L'accès vérifie activation, palier, format, durée, résolution, solde et concurrence.
- Le portefeuille consomme promotionnel, abonnement, puis acheté ; toute mutation
  produit une écriture. Une réservation atomique empêche le double débit.
- En PostgreSQL, la réservation doit s'effectuer dans une transaction avec
  `SELECT ... FOR UPDATE` sur le portefeuille, puis créer l'écriture et le job avant
  tout appel fournisseur.
- La contrainte unique des événements de paiement assure l'idempotence durable des
  webhooks. La redirection Checkout n'est jamais une preuve de paiement.

Les migrations incluent les plans Starter, Pro et Agency, une remise annuelle de
deux mois, trois packs de crédits et les paramètres de marge modifiables. Les prix
sont stockés en centimes hors taxes.
