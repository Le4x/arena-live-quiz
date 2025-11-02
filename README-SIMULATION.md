# 🤖 Système de Simulation Automatique

## Vue d'ensemble

Le système de simulation permet de tester l'application Music Arena de manière automatisée en simulant des équipes virtuelles qui participent au jeu de façon réaliste.

## Fonctionnalités

### ✅ Ce que la simulation fait

1. **Création d'équipes simulées** (préfixe `SIM-`)
   - Génération automatique de 1 à 50 équipes
   - Couleurs distinctes assignées automatiquement
   - Gestion complète du cycle de vie des équipes

2. **Réponse aux buzzers**
   - Détection automatique de l'activation du buzzer
   - Temps de réaction réaliste (configurable entre 100ms et 5000ms)
   - 30-70% des équipes buzzent aléatoirement
   - Premier arrivé, premier servi

3. **Soumission de réponses**
   - **Questions QCM** : Sélection d'options avec probabilité de bonnes réponses configurable
   - **Questions texte libre** : Génération de variations de la bonne réponse ou réponses aléatoires
   - 60-90% des équipes soumettent une réponse
   - Délais de réponse réalistes (configurable entre 2s et 10s)

4. **Configuration avancée**
   - Temps de réaction au buzzer (min/max)
   - Temps de réponse aux questions (min/max)
   - Probabilité de réponse correcte (0-100%)
   - Mise à jour en temps réel via React Query

## Utilisation

### 1. Créer des équipes de simulation

1. Accéder à **Admin → Gestion des Équipes**
2. Cliquer sur **"Mode Simulation"**
3. Choisir le nombre d'équipes (1-50)
4. Cliquer sur **"Créer X équipes"**

### 2. Configurer la simulation

Le **Panneau de Contrôle de Simulation** apparaît automatiquement après la création des équipes.

**Paramètres disponibles** :
- **Temps de réaction au buzzer** : Délai entre l'activation du buzzer et la réponse
- **Temps de réponse aux questions** : Délai pour soumettre une réponse
- **Probabilité de réponse correcte** : Pourcentage de bonnes réponses (0-100%)

### 3. Démarrer la simulation

1. Ajuster les paramètres si nécessaire
2. Cliquer sur **"Démarrer la simulation"**
3. Les équipes simulées réagissent automatiquement aux événements du jeu

### 4. Arrêter la simulation

Cliquer sur **"Arrêter la simulation"** pour mettre en pause l'automatisation.

### 5. Quitter le mode simulation

Cliquer sur **"Quitter Simulation"** pour supprimer toutes les équipes `SIM-*`.

## Architecture technique

### Hook principal : `useGameSimulation`

```typescript
const {
  isRunning,           // État de la simulation
  simulatedTeams,      // Liste des équipes simulées
  config,              // Configuration actuelle
  startSimulation,     // Démarrer
  stopSimulation,      // Arrêter
  updateConfig,        // Modifier la config
} = useGameSimulation();
```

### Fonctionnement interne

1. **Écoute en temps réel** (`game_state`)
   - Détection de `is_buzzer_active`
   - Détection de `current_question_id`

2. **Simulation de buzzers**
   - Vérification des buzzers existants (pas de doublon)
   - Sélection aléatoire des équipes qui buzzent
   - Insertion dans `buzzer_attempts` avec délai réaliste

3. **Simulation de réponses**
   - Récupération des détails de la question
   - Génération de réponse selon le type (QCM/texte)
   - Insertion dans `team_answers` avec délai configurable

4. **Gestion des timeouts**
   - Stockage des timeouts dans des `Map` pour annulation propre
   - Nettoyage automatique à l'arrêt de la simulation

## Cas d'usage

### 🧪 Tests fonctionnels
- Valider le système de buzzer sous charge
- Tester la correction automatique des réponses
- Vérifier la mise à jour du leaderboard en temps réel

### 🎭 Démonstration
- Présenter l'application à des clients
- Faire des captures d'écran/vidéos
- Montrer le flux complet sans participants réels

### 🚀 Tests de performance
- Simuler 50 équipes pour tester les limites
- Vérifier la stabilité de la synchronisation real-time
- Mesurer les temps de réponse du système

### 🐛 Debugging
- Reproduire des bugs de manière contrôlée
- Tester les cas limites (tous buzzent, personne ne répond, etc.)
- Valider les corrections avant déploiement

## Limitations connues

- ⚠️ Les équipes simulées ne peuvent pas utiliser les jokers
- ⚠️ Pas de simulation de connexion/déconnexion réseau
- ⚠️ Les réponses texte sont basiques (pas d'IA générative)

## Améliorations futures

- [ ] Simulation de jokers aléatoires
- [ ] Profils de comportement (équipe rapide, lente, intelligente, etc.)
- [ ] Simulation de latence réseau
- [ ] Génération de réponses texte plus intelligentes via AI
- [ ] Mode "Replay" pour rejouer une partie enregistrée
- [ ] Statistiques détaillées sur les performances des équipes simulées

## Sécurité

✅ **Isolation des données** : Les équipes `SIM-*` sont facilement identifiables et supprimables
✅ **Pas de modification de données réelles** : La simulation n'affecte pas les équipes non-simulées
✅ **Arrêt d'urgence** : Bouton "Quitter Simulation" pour tout nettoyer instantanément

---

**Note** : Ce système est conçu pour le développement et les tests. En production, assurez-vous de ne pas activer la simulation pendant des événements réels.
