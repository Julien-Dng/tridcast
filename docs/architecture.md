# Architecture du MVP

## Décisions

Le métier pilote les champs via une `verticalDefinition` versionnée. L'entrée validée est immuable au lancement ; le constructeur produit un `renderPlan` sans notion Replicate. Le provider anime éventuellement les médias, puis le composer fabrique seul le livrable final. Les statuts interdisent donc de passer directement de `processing` à `completed`.

L'authentification repose sur un cookie JWT HTTP-only compatible App Router. Chaque requête métier compare l'organisation de session avec celle de la ressource. En production, les mutations regroupent projet, job et réservation de crédits dans une transaction PostgreSQL.

## Phases livrées

1. Next.js, configuration, Neon/Drizzle, session, organisations et Zod.
2. Dashboard, assistant dynamique, brouillons visuels, médias et marque.
3. Render plan, aperçu, trois templates et fournisseur mock.
4. Port Replicate, états asynchrones et stratégie webhook/reprise.
5. Compositeur mock, historique, tests et documentation.

Le mock en mémoire illustre le contrat mais un worker durable reste requis pour une exploitation multi-instance.
