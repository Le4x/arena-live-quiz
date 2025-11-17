# 🎵 Arena Live Quiz - Plateforme Professionnelle de Quiz en Direct

<div align="center">

**La plateforme professionnelle type Kahoot pour blindtests et quiz en direct**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff?logo=vite)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2.76-3ecf8e?logo=supabase)](https://supabase.com/)

</div>

---

## 📋 Table des matières

- [🌟 Caractéristiques](#-caractéristiques)
- [🏗️ Architecture](#️-architecture)
- [🚀 Démarrage rapide](#-démarrage-rapide)
- [📦 Technologies utilisées](#-technologies-utilisées)
- [🧪 Tests](#-tests)
- [🔧 Configuration](#-configuration)
- [📖 Documentation](#-documentation)

---

## 🌟 Caractéristiques

### ✨ Fonctionnalités principales

- **🎮 Trois modes de jeu**
  - QCM (Choix multiples)
  - Blind Test (Audio avec cue points)
  - Questions texte (avec fuzzy matching)

- **👥 Multi-joueurs en temps réel**
  - Jusqu'à 60+ équipes simultanées
  - Synchronisation en temps réel via Supabase Realtime
  - Système de buzzer ultra-réactif

- **🎯 Interface Régie professionnelle**
  - Contrôle total du jeu en temps réel
  - Audio deck avec cue points
  - Gestion des buzzers et réponses
  - Monitoring des équipes

- **📺 Écrans TV spectaculaires**
  - Affichage des questions
  - Leaderboard en temps réel
  - Écrans de sponsors
  - Mode karaoké avec paroles

- **📱 Interface Client optimisée**
  - Connexion par PIN
  - Buzzer tactile
  - Réponses instantanées
  - Suivi des scores

- **🏆 Système de Finale**
  - Jokers (50/50, appel équipe, vote public)
  - Multiplicateurs de points
  - Mode élimination
  - Vote public interactif

### 🎨 Design & UX

- Design system professionnel cohérent
- Thème sombre inspiré du logo
- Animations fluides avec Framer Motion
- Interface responsive
- Effets visuels élégants

### 🔒 Sécurité & Fiabilité

- TypeScript strict mode
- Error boundaries React
- Monitoring Sentry intégré
- Gestion d'erreurs robuste
- Tests unitaires et E2E
- CI/CD avec GitHub Actions

---

## 🏗️ Architecture

### Stack technique

```
Frontend
├── React 18.3 + TypeScript 5.8
├── Vite 5.4 (build ultra-rapide)
├── Tailwind CSS + shadcn/ui
├── Zustand (state management)
├── React Query (server state)
└── Framer Motion (animations)

Backend
├── Supabase (PostgreSQL + Realtime)
├── Row Level Security (RLS)
├── Edge Functions
└── Storage (audio, images)

DevOps
├── GitHub Actions (CI/CD)
├── Sentry (monitoring)
├── Vitest (tests unitaires)
└── AWS Amplify (déploiement)
```

### Structure du projet

```
arena-live-quiz/
├── src/
│   ├── components/       # Composants React
│   │   ├── admin/       # Admin & Setup
│   │   ├── client/      # Interface équipes
│   │   ├── regie/       # Contrôle régie
│   │   ├── tv/          # Écrans TV
│   │   └── ui/          # shadcn/ui components
│   ├── hooks/           # React hooks personnalisés
│   ├── lib/             # Bibliothèques
│   │   ├── audio/       # AudioEngine
│   │   ├── error/       # Gestion d'erreurs
│   │   ├── monitoring/  # Sentry
│   │   └── utils/       # Utilitaires
│   ├── pages/           # Pages/Routes
│   ├── stores/          # Zustand stores
│   ├── styles/          # Design system
│   └── types/           # TypeScript types
├── supabase/
│   ├── functions/       # Edge functions
│   └── migrations/      # Migrations DB
├── .github/
│   └── workflows/       # CI/CD
└── docs/                # Documentation
```

---

## 🚀 Démarrage rapide

### Prérequis

- Node.js 20+
- npm ou bun
- Compte Supabase
- (Optionnel) Compte Sentry

### Installation

1. **Cloner le dépôt**

```bash
git clone https://github.com/Le4x/arena-live-quiz.git
cd arena-live-quiz
```

2. **Installer les dépendances**

```bash
npm install
# ou
bun install
```

3. **Configurer les variables d'environnement**

```bash
cp .env.example .env
```

Éditer `.env` avec vos credentials :

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-key

# Sentry (optionnel)
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# App
VITE_APP_VERSION=1.0.0
```

4. **Lancer en développement**

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:8080`

### Build de production

```bash
npm run build
npm run preview  # Prévisualiser le build
```

---

## 📦 Technologies utilisées

### Frontend

| Technologie | Version | Description |
|------------|---------|-------------|
| React | 18.3.1 | UI Library |
| TypeScript | 5.8.3 | Type safety |
| Vite | 5.4.19 | Build tool |
| Tailwind CSS | 3.4.17 | Styling |
| shadcn/ui | Latest | UI Components |
| Zustand | 5.0.8 | State management |
| React Query | 5.90.6 | Server state |
| Framer Motion | 12.23.24 | Animations |
| React Router | 6.30.1 | Routing |

### Backend & Infrastructure

| Technologie | Description |
|------------|-------------|
| Supabase | Backend-as-a-Service |
| PostgreSQL | Base de données |
| Supabase Realtime | WebSocket temps réel |
| Supabase Auth | Authentification |
| Supabase Storage | Stockage fichiers |

### DevOps & Qualité

| Outil | Description |
|-------|-------------|
| Vitest | Tests unitaires |
| Testing Library | Tests React |
| Sentry | Monitoring erreurs |
| GitHub Actions | CI/CD |
| ESLint | Linting |
| Prettier | Formatting |
| TypeScript | Type checking |

---

## 🧪 Tests

### Lancer les tests

```bash
# Tests en mode watch
npm run test

# Tests une fois
npm run test:run

# Coverage
npm run test:coverage

# UI de tests
npm run test:ui
```

### Écrire des tests

Exemple de test unitaire :

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('should render', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

---

## 🔧 Configuration

### Variables d'environnement

| Variable | Description | Requis |
|----------|-------------|--------|
| `VITE_SUPABASE_URL` | URL du projet Supabase | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Clé anonyme Supabase | ✅ |
| `VITE_SENTRY_DSN` | DSN Sentry pour monitoring | ❌ |
| `VITE_SENTRY_ENABLE_DEV` | Activer Sentry en dev | ❌ |
| `VITE_APP_VERSION` | Version de l'app | ❌ |

### Configuration TypeScript

Le projet utilise TypeScript en **mode strict** pour une sécurité maximale :

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Scripts disponibles

```bash
npm run dev              # Démarrer en développement
npm run build            # Build de production
npm run preview          # Prévisualiser le build
npm run test             # Tests en mode watch
npm run test:run         # Tests une fois
npm run test:coverage    # Coverage
npm run test:ui          # UI de tests
npm run type-check       # Vérifier les types
npm run lint             # Linter
```

---

## 📖 Documentation

### Documentation additionnelle

- [📐 Architecture Multi-tenant](./README-MUSICARENA-PRO.md)
- [🎯 Système de simulation](./README-SIMULATION.md)
- [📊 Instances de questions](./README-SYSTEM-INSTANCES.md)

### Ressources

- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vitest](https://vitest.dev/)

---

## 🎯 Roadmap

### ✅ Complété

- [x] Architecture temps réel optimisée
- [x] Système de finale avec jokers
- [x] Optimisations performance (60+ équipes)
- [x] TypeScript strict mode
- [x] Error boundaries & Sentry
- [x] Tests unitaires setup
- [x] CI/CD GitHub Actions
- [x] Design system professionnel

### 🚧 En cours

- [ ] Tests E2E avec Playwright
- [ ] Documentation API complète
- [ ] Multi-tenant architecture
- [ ] Stripe integration

### 📅 Prévu

- [ ] Mode offline/dégradé
- [ ] Analytics avancés
- [ ] Export de rapports
- [ ] Mobile apps (React Native)

---

## 📝 Licence

Copyright © 2024 Arena Live Quiz. Tous droits réservés.

---

## 📧 Contact

Pour toute question : [Créer une issue](https://github.com/Le4x/arena-live-quiz/issues)

---

<div align="center">

**Fait avec ❤️ pour créer la meilleure expérience de quiz en direct**

</div>
