# 🎮 MusicArena Pro - Guide du système

## 🚀 Nouveautés Niveau TV

### 1️⃣ AudioEngine Pro 🎧

**Moteur audio unifié** pour contrôler tous les sons du jeu.

#### Fonctionnalités
- **Fade in/out** : Transitions douces entre les pistes
- **Cue points** : 8 hot-cues configurables (touches 1-8)
- **Waveform preview** : Visualisation de l'audio
- **Préchargement** : Toutes les tracks en mémoire
- **Crossfade** : Transition fluide entre deux morceaux

#### Raccourcis clavier (AudioDeck)
```
Space / P     → Play / Pause
↑ / ↓         → Volume +/-
F             → Fade toggle
1-8           → Sauter aux cue points
```

#### Utilisation dans la régie
1. Aller dans l'onglet **Audio**
2. Sélectionner une track
3. Utiliser les contrôles ou les raccourcis
4. Configurer les cue points dans **Admin > Sons**

---

### 2️⃣ Animations TV 📺

**Composants professionnels** pour un rendu de niveau émission télé.

#### JingleRoundIntro
Animation d'introduction de manche avec :
- Logo ARENA animé
- Titre de la manche
- Countdown circulaire
- Particules dynamiques
- Durée : 10 secondes

#### JingleReveal
Animation de révélation (bonne/mauvaise réponse) :
- Explosion de particules
- Icon géant Check/X
- Pulse rings
- Durée : 3s (correct) / 2s (incorrect)

#### LeaderboardTransition
Classement animé style TV show :
- Top 3 avec podium visuel
- Slide-in séquencé
- Effets de brillance
- Fond animé gradient

**Déclenchement automatique** depuis l'écran public quand :
- `show_round_intro = true` → JingleRoundIntro
- `answer_result = 'correct'/'incorrect'` → JingleReveal
- `show_leaderboard = true` → LeaderboardTransition

---

### 3️⃣ Fix Buzzer Smartphone ⚡

**Problème résolu** : Le buzzer restait désactivé après un reset.

#### Solution
- Nouveau système d'événements temps-réel
- Event `BUZZER_RESET` émis par la régie
- Auto-réactivation instantanée sur tous les clients
- Focus automatique sur le bouton buzzer

#### Comment ça marche
1. **Régie** : Clic sur "Réinitialiser tout"
2. **Serveur** : Event `BUZZER_RESET` broadcast
3. **Clients** : Réception → `hasBuzzed = false` + focus()
4. **Résultat** : Buzzer réactivé sans refresh

**Testé sur** : iOS Safari, Android Chrome, Desktop

---

### 4️⃣ Question Instance ID 🔄

**Problème résolu** : Réponses persistantes sur questions répétées.

#### Solution
- Chaque lancement génère un `questionInstanceId` unique (UUID)
- Tous les buzzers/réponses liés à cette instance
- Répéter une question = nouvelle instance = état vierge

#### Architecture
```typescript
// Régie lance une question
const instanceId = crypto.randomUUID();
setQuestion(questionId, instanceId);

// Clients buzzent avec instanceId
buzzer_attempts: {
  question_id,
  question_instance_id, // ← Nouveau !
  team_id,
}

// Réponses aussi
team_answers: {
  question_id,
  question_instance_id, // ← Nouveau !
  answer,
}
```

**Résultat** : Aucune réponse résiduelle entre deux lancers.

---

### 5️⃣ Régie Refactorée 🎬

**Organisation en tabs** pour une navigation claire.

#### Sections
| Tab | Contenu |
|-----|---------|
| **Contrôles** | Buzzer, Musique, Score, Question suivante |
| **Audio** | AudioDeck pro + Jingles de manche |
| **Questions** | Sélection manche + Liste questions |
| **Équipes** | Liste connectées avec scores |
| **Écran** | Question actuelle + Stats |

#### HUD Régie
- **Connected clients** : Nombre d'équipes connectées
- **Questions préchargées** : Feedback lors du jingle
- **Instance ID** : Debug visible pour tracking

---

## 🧰 Architecture Technique

### Transport Layer
```typescript
// src/lib/runtime/Transport.ts
interface Transport {
  publish(channel, payload): Promise<void>;
  subscribe(channel, handler): unsubscribe;
  now(): number; // Clock sync
}

// Implémentations
- SupabaseTransport (actuel)
- LocalWSTransport (futur LAN/offline)
```

**Avantage** : Switcher entre Supabase et WebSocket LAN sans changer le code métier.

### GameEvents
```typescript
// src/lib/runtime/GameEvents.ts
gameEvents.resetBuzzer(instanceId);
gameEvents.startQuestion(questionId, instanceId, sessionId);

// Abonnement
gameEvents.on('BUZZER_RESET', (event) => {
  // Handle reset
});
```

**Événements disponibles** :
- `BUZZER_RESET`
- `START_QUESTION`
- `STOP_QUESTION`
- `SHOW_LEADERBOARD`
- `PLAY_JINGLE`
- `SYNC_STATE`

---

## 📦 Installation / Dev

### Prérequis
```bash
Node.js 18+
npm ou bun
```

### Lancer en dev
```bash
npm install
npm run dev
```

### Env vars (Supabase)
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

**Mode LAN** : Venir bientôt (LocalWSTransport)

---

## 🎯 Critères d'Acceptance ✅

- [x] AudioEngine unifié avec fade/cue
- [x] Cue points configurable + raccourcis clavier
- [x] Transitions TV cinématiques (intro, reveal, leaderboard)
- [x] Buzzer reset instantané sur smartphones
- [x] Questions répétables sans conflit (instanceId)
- [x] Régie organisée en tabs
- [x] Architecture Transport prête pour LAN
- [x] Interface 100% en français
- [ ] Mode offline/LAN (futur)
- [ ] Waveform réelle (nécessite wavesurfer.js)

---

## 🚨 Troubleshooting

### Le buzzer ne se réactive pas
1. Vérifier que `current_question_instance_id` est défini dans `game_state`
2. Check console client : "🔔 Événement BUZZER_RESET reçu"
3. S'assurer que Supabase realtime fonctionne

### L'audio ne fade pas correctement
1. Vérifier `gainNode.gain` dans DevTools
2. Check que `audioContext.state` === 'running'
3. iOS : Besoin d'un user gesture pour lancer AudioContext

### Les animations TV ne s'affichent pas
1. Vérifier import framer-motion (`npm install framer-motion`)
2. Check console pour erreurs de composants
3. S'assurer que `show_round_intro` / `answer_result` sont bien définis

### Questions répétées gardent les réponses
1. Vérifier migration BD : colonne `question_instance_id`
2. Check Régie : `currentQuestionInstanceId` généré ?
3. Clients : `questionInstanceId` dans les inserts ?

---

## 📝 Roadmap Future

### Phase 2 (Mars 2025)
- [ ] Mode LAN/Offline complet (LocalWSTransport)
- [ ] Waveform réelle (wavesurfer.js)
- [ ] Playlists réordonnables
- [ ] Hotkeys globaux configurables
- [ ] Wake Lock (empêcher mise en veille)

### Phase 3 (Avant événement)
- [ ] Import/Export shows complets
- [ ] Statistiques détaillées post-game
- [ ] Replays animés des meilleurs moments
- [ ] Mode spectateur (stream-friendly)

---

## 💬 Support

En cas de problème :
1. Check console logs (🔔 emojis = événements)
2. Vérifier DB migrations (`question_instance_id`)
3. Tester en incognito (cache issues)
4. Consulter ce README

**MusicArena #1 - 21 Février 2026** 🎉

Prêt pour un show de niveau TV !
