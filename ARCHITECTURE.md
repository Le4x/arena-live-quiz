# Architecture ARENA - Refactoring Professionnel

## 📐 Vue d'ensemble

L'application ARENA a été refactorisée pour suivre les meilleures pratiques de développement React/TypeScript avec une architecture moderne, maintenable et performante.

## 🏗️ Structure de l'architecture

### 1. **Gestion de l'état (State Management)**

#### Zustand Stores
- **`gameStore.ts`** : État global du jeu (session, gameState, round, question, teams)
- **`buzzerStore.ts`** : Gestion des buzzers (tentatives, lock, positions audio/timer)
- **`audioStore.ts`** : État de l'AudioEngine (tracks, playback, volume)

**Avantages** :
- État prévisible et centralisé
- Performance optimisée (pas de re-render inutiles)
- DevTools intégrés pour debugging

#### React Query (TanStack Query)
- **`useGameData.ts`** : Hooks pour fetch/mutate les données serveur
- Cache intelligent avec invalidation automatique
- Retry et gestion d'erreurs automatiques
- Synchronisation avec Realtime via `useRealtimeSync`

### 2. **Real-time Management**

#### RealtimeManager (Singleton)
- Gestionnaire centralisé de connexions Supabase Realtime
- Reconnexion automatique avec backoff exponentiel
- Heartbeat pour maintenir les connexions actives
- Détection de visibilité (tab inactive/active)
- Gestion propre des subscriptions/unsubscriptions

**Features** :
- Auto-reconnect après perte réseau
- Channel pooling (évite duplications)
- Retry intelligent avec délais croissants
- Cleanup automatique

### 3. **Hooks personnalisés par domaine**

#### Hooks Régie (`hooks/regie/`)
- **`useRegieGameState`** : Gestion état du jeu
- **`useRegieBuzzers`** : Gestion buzzers avec auto-lock

#### Hooks Client (`hooks/client/`)
- **`useClientConnection`** : Présence et heartbeat
- **`useClientBuzzer`** : Actions de buzzer côté client

#### Hooks Screen (`hooks/screen/`)
- **`useScreenRealtime`** : Setup channels realtime pour TV

### 4. **Logging structuré**

#### Logger (`lib/utils/logger.ts`)
- Niveaux : `debug`, `info`, `warn`, `error`
- Helpers spécialisés : `realtime()`, `audio()`, `buzzer()`, `game()`
- Timestamps automatiques
- Emojis pour visibilité en console

### 5. **TypeScript strict**

#### Types centralisés (`types/game.types.ts`)
- Interfaces complètes pour toutes les entités
- Pas de `any` (sauf edge cases documentés)
- Types dérivés pour éviter duplication

## 📊 Page de Monitoring

### `/monitoring` - Surveillance système

**Métriques en temps réel** :
- ✅ Latence base de données (ms)
- 📡 État des channels Realtime (actifs/total)
- 🔄 Nombre de reconnexions
- 💾 Mémoire JavaScript utilisée

**Fonctionnalités** :
- Mise à jour automatique toutes les 5s
- Alertes visuelles (ok/warning/error)
- Logs système avec historique
- Vue détaillée des channels Realtime

**Usage** :
- Accessible depuis l'accueil (bouton Monitoring)
- Protégé par authentification admin
- Idéal pour debug en production

## 🎯 Avantages de l'architecture

### Performance
- ✅ Pas de polling inutile (100% realtime)
- ✅ Cache intelligent (React Query)
- ✅ Re-renders optimisés (Zustand selectors)
- ✅ Lazy loading et code splitting prêt

### Maintenabilité
- ✅ Séparation des préoccupations claire
- ✅ Composants < 200 lignes en moyenne
- ✅ Hooks réutilisables par domaine
- ✅ Types stricts partout

### Fiabilité
- ✅ Reconnexion automatique robuste
- ✅ Retry avec backoff exponentiel
- ✅ Gestion d'erreurs centralisée
- ✅ Logging structuré pour debug

### Developer Experience
- ✅ Code auto-documenté
- ✅ DevTools (Zustand + React Query)
- ✅ Logs clairs avec emojis
- ✅ Architecture facile à étendre

## 🔧 Prochaines optimisations possibles

### Phase 5 - Performance (À venir)
- [ ] Memoization avec React.memo sur composants lourds
- [ ] useMemo/useCallback pour callbacks coûteux
- [ ] Virtual scrolling pour grandes listes
- [ ] Code splitting par route
- [ ] Lazy loading des composants lourds

### Phase 6 - Tests (À venir)
- [ ] Tests unitaires (Vitest)
- [ ] Tests d'intégration (React Testing Library)
- [ ] Tests E2E (Playwright)
- [ ] Coverage > 80%

## 📝 Conventions

### Naming
- **Stores** : `useXxxStore`
- **Hooks** : `useXxxYyy`
- **Components** : `PascalCase`
- **Files** : `camelCase.ts` ou `PascalCase.tsx`

### Structure fichiers
```
src/
├── components/       # Composants UI réutilisables
├── hooks/           # Hooks personnalisés
│   ├── regie/       # Hooks spécifiques Régie
│   ├── client/      # Hooks spécifiques Client
│   └── screen/      # Hooks spécifiques Screen
├── lib/             # Utilitaires & logique métier
│   ├── audio/       # AudioEngine
│   ├── realtime/    # RealtimeManager
│   └── utils/       # Logger, etc.
├── pages/           # Pages principales
├── providers/       # React Context Providers
├── stores/          # Zustand stores
└── types/           # Types TypeScript
```

## 🚀 Démarrage

1. **Installation** : `npm install`
2. **Dev** : `npm run dev`
3. **Build** : `npm run build`
4. **Preview** : `npm run preview`

## 🔍 Debug

### DevTools
- **React Query** : Ouvrir DevTools React Query en dev
- **Zustand** : Redux DevTools Extension compatible
- **Logs** : Console avec emojis + timestamps

### Monitoring
- Accéder à `/monitoring` pour vue système en temps réel
- Vérifier latence DB, état channels, reconnexions

## 📚 Ressources

- [React Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
