# 🎯 Système d'Instances - MusicArena

## Problème résolu

**Avant** : Si une question était rejouée, les anciennes réponses et buzzers restaient visibles, créant confusion et bugs.

**Maintenant** : Chaque fois qu'une question est lancée, une nouvelle **instance unique** est créée. Les réponses/buzzers sont liés à cette instance, pas directement à la question.

---

## Architecture

### Tables BD

```
questions
├── id (UUID)
├── question_text
├── audio_url
├── cue_points (JSON)
└── ...

question_instances
├── id (UUID) ← Instance unique générée à chaque lancement
├── question_id (FK → questions)
├── game_session_id (FK → game_sessions)
├── started_at (timestamp)
└── ended_at (timestamp nullable)

buzzer_attempts
├── team_id
├── question_id (pour référence)
├── question_instance_id ← Clé liée à l'instance !
└── ...

team_answers
├── team_id
├── question_id (pour référence)
├── question_instance_id ← Clé liée à l'instance !
├── answer
└── ...
```

---

## Flux de jeu

### 1️⃣ Lancer une question (Régie)

```typescript
const startQuestion = async (question: any) => {
  const instanceId = crypto.randomUUID();
  
  // Créer l'instance dans la BD
  await supabase.from('question_instances').insert({
    id: instanceId,
    question_id: question.id,
    game_session_id: sessionId,
    started_at: new Date().toISOString()
  });
  
  // Publier l'événement avec instanceId
  await gameEvents.startQuestion(question.id, instanceId, sessionId);
  
  // Lancer audio/chrono...
};
```

### 2️⃣ Recevoir l'instance (Client)

```typescript
// Subscribe à START_QUESTION
gameEvents.on<StartQuestionEvent>('START_QUESTION', (event) => {
  setCurrentQuestionInstanceId(event.data.questionInstanceId);
});
```

### 3️⃣ Buzzer avec instance (Client)

```typescript
const handleBuzzer = async () => {
  await supabase.from('buzzer_attempts').insert({
    team_id: team.id,
    question_id: currentQuestion.id,
    question_instance_id: currentQuestionInstanceId, // ← Instance !
    game_session_id: gameState.game_session_id
  });
};
```

### 4️⃣ Répondre avec instance (Client)

```typescript
const submitAnswer = async () => {
  await supabase.from('team_answers').insert({
    team_id: team.id,
    question_id: currentQuestion.id,
    question_instance_id: currentQuestionInstanceId, // ← Instance !
    answer: finalAnswer,
    game_session_id: gameState.game_session_id
  });
};
```

---

## Avantages

✅ **Question répétable** : Relancer la même question = nouvelle instance = état vierge

✅ **Historique propre** : Chaque instance garde son historique (debug/stats)

✅ **Zero collision** : Impossible que des réponses d'une ancienne instance interfèrent

✅ **Isolation temporelle** : Chaque tentative est isolée dans le temps

---

## Événements temps réel

### BUZZER_RESET

Réactive les buzzers après une mauvaise réponse :

```typescript
gameEvents.on<BuzzerResetEvent>('BUZZER_RESET', (event) => {
  if (event.data.questionInstanceId === currentQuestionInstanceId) {
    setHasBuzzed(false);
    buzzerButtonRef.current?.focus(); // Auto-focus !
  }
});
```

### START_QUESTION

Démarre une nouvelle instance :

```typescript
{
  type: 'START_QUESTION',
  data: {
    questionId: 'abc-123',
    questionInstanceId: 'def-456', // ← Nouvelle instance
    sessionId: 'ghi-789'
  },
  timestamp: 1709218800000
}
```

---

## Requêtes fréquentes

### Trouver tous les buzzers d'une instance

```sql
SELECT * FROM buzzer_attempts 
WHERE question_instance_id = '<instance-id>'
ORDER BY buzzed_at ASC;
```

### Trouver toutes les réponses d'une instance

```sql
SELECT * FROM team_answers 
WHERE question_instance_id = '<instance-id>'
ORDER BY answered_at ASC;
```

### Historique d'une question

```sql
SELECT qi.*, 
       COUNT(DISTINCT ba.team_id) as buzz_count,
       COUNT(DISTINCT ta.team_id) as answer_count
FROM question_instances qi
LEFT JOIN buzzer_attempts ba ON ba.question_instance_id = qi.id
LEFT JOIN team_answers ta ON ta.question_instance_id = qi.id
WHERE qi.question_id = '<question-id>'
GROUP BY qi.id
ORDER BY qi.started_at DESC;
```

---

## Debugging

### Vérifier l'instance actuelle

```typescript
// Côté Régie
console.log('Current instance:', currentQuestionInstanceId);

// Côté Client
console.log('Client instance:', currentQuestionInstanceId);
console.log('GameState instance:', gameState?.current_question_instance_id);
```

### Si buzzers ne s'activent pas

1. Vérifier que `question_instance_id` est bien défini
2. Check console : "🎯 Nouvelle question" doit afficher l'instanceId
3. Vérifier que `gameState.is_buzzer_active === true`

### Si réponses persistent entre lancers

1. Vérifier que `question_instance_id` est différent à chaque lancement
2. Check BD : `question_instances` doit avoir un nouvel enregistrement
3. Vérifier que Client utilise bien `currentQuestionInstanceId` et pas seulement `question_id`

---

## Migration effectuée

```sql
CREATE TABLE public.question_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL,
  game_session_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_question_instances_question_id ON question_instances(question_id);
CREATE INDEX idx_question_instances_session_id ON question_instances(game_session_id);
```

---

## Tests à faire

- [x] Lancer une question → nouvelle instance créée
- [x] Buzzer fonctionne avec l'instance
- [x] Répondre fonctionne avec l'instance
- [x] Relancer la même question → nouvelle instance distincte
- [x] Anciennes réponses ne réapparaissent pas
- [x] BUZZER_RESET réactive bien les buzzers
- [x] Client reçoit bien le START_QUESTION event

---

## Prochaines évolutions possibles

💡 **Statistiques par instance** : Temps moyen de réponse, taux de réussite

💡 **Rejeu intelligent** : Suggérer questions mal réussies

💡 **Historique détaillé** : Timeline complète de chaque instance

💡 **End instance** : Marquer `ended_at` quand on passe à la question suivante

---

**MusicArena #1 - 21 Février 2026** 🎉
