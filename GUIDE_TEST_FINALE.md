# 🎮 GUIDE COMPLET - Tester le Système de Finale

Ce guide vous explique **étape par étape** comment appliquer et tester le système de finale personnalisable.

---

## 📋 PRÉREQUIS

1. ✅ Avoir une session de jeu active
2. ✅ Avoir au moins 4 équipes créées avec des scores
3. ✅ Avoir accès au dashboard Supabase

---

## 🚀 ÉTAPE 1 : Appliquer les migrations

### Option A : Dashboard Supabase (RECOMMANDÉ)

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur **SQL Editor** dans le menu gauche
4. Cliquez sur **New Query**
5. Copiez-collez le contenu de `supabase/migrations/20251113000001_finale_customization.sql`
6. Cliquez sur **RUN** (ou F5)
7. Vérifiez qu'il n'y a pas d'erreurs

### Option B : CLI Supabase

```bash
# Si vous avez Supabase CLI installé
supabase db reset
```

---

## 🧪 ÉTAPE 2 : Créer des données de test

### Dans le SQL Editor de Supabase :

1. Créez une **nouvelle requête**
2. Copiez-collez le contenu de `supabase/migrations/TEST_FINALE_COMPLETE.sql`
3. **RUN**
4. Vous devriez voir :
   ```
   ✅ Colonnes de personnalisation détectées
   ✅ Session trouvée: [UUID]
   ✅ Jokers trouvés
   ✅ 8 équipes sélectionnées
   ✅ Finale créée: [UUID]
   ✅ Jokers créés pour toutes les équipes

   🎉 FINALE DE TEST CRÉÉE AVEC SUCCÈS !
   ```

---

## 🖥️ ÉTAPE 3 : Tester dans l'interface

### 3.1 - Accéder à la Régie

1. Ouvrez votre application : `http://localhost:5173/regie` (ou votre URL)
2. Connectez-vous si nécessaire
3. Scrollez jusqu'à la section **"Mode Final - Configuration Complète"**

### 3.2 - Vérifier la finale

Vous devriez voir :
```
┌─────────────────────────────────────────────┐
│ TEST - Finale Personnalisée créée          │
│ 8 finalistes - Statut: pending             │
│ ⚡ Points ×2                                │
│                                             │
│ [🎬 Lancer l'Introduction]                 │
└─────────────────────────────────────────────┘
```

### 3.3 - Lancer la finale

1. Cliquez sur **"🎬 Lancer l'Introduction"**
   - L'écran TV devrait afficher l'intro avec thème arc-en-ciel 🌈
   - Les 8 équipes sont affichées en grille
   - Les jokers sont visibles

2. Cliquez sur **"🏁 Activer la Finale"**
   - Le statut passe à "active"
   - Les jokers deviennent utilisables

---

## ⚡ ÉTAPE 4 : Tester les jokers

### 4.1 - Côté Client (Équipe)

1. Ouvrez `http://localhost:5173/client` (ou votre URL client)
2. Connectez-vous avec une équipe finaliste
3. Vous devriez voir le **panneau de jokers** :

```
┌─────────────────────────┐
│ ⚡ Jokers              │
│                         │
│ [➗ 2/2] [👥 1/1] [🗳️ 3/3] │
└─────────────────────────┘
```

4. Durant une question, cliquez sur un joker pour l'utiliser
5. Le compteur devrait diminuer : `[➗ 1/2]`

### 4.2 - Effets des jokers

| Joker | Effet | Test |
|-------|-------|------|
| **➗ fifty_fifty** | Élimine 2 mauvaises réponses | Utilisez-le sur une QCM, 2 réponses disparaissent |
| **👥 team_call** | Appel à l'équipe | Message affiché à tous les clients |
| **🗳️ public_vote** | Vote du public | Les spectateurs peuvent voter |

---

## 🎨 ÉTAPE 5 : Créer votre propre finale

### Dans la Régie :

1. Si une finale existe, cliquez sur **"Désactiver"**
2. Vous verrez le formulaire de configuration complet

### Configuration recommandée pour débuter :

```
┌─────────────────────────────────────┐
│ Configuration Générale              │
├─────────────────────────────────────┤
│ Nom: Ma Première Finale            │
│ Finalistes: 8 équipes              │
│ Sélection: Automatique (Top 8)     │
│ Score minimum: 0                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Règles de Scoring                   │
├─────────────────────────────────────┤
│ Multiplicateur: ×2.0 (Double)      │
│ Bonus 1ère réponse: 50             │
│ ☐ Bonus de vitesse                 │
│ ☐ Mode élimination                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Apparence & Affichage               │
├─────────────────────────────────────┤
│ Thème: 🥇 Or                        │
│ Durée intro: 10 secondes           │
│ ☑️ Vote du public activé           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Jokers                              │
├─────────────────────────────────────┤
│ ☑️ fifty_fifty × 2                  │
│ ☑️ team_call × 1                    │
│ ☑️ public_vote × 2                  │
└─────────────────────────────────────┘
```

3. Cliquez sur **"🏆 Créer Ma Première Finale"**

---

## 🎯 EXEMPLES DE CONFIGURATIONS

### Exemple 1 : Demi-Finale Simple
```
Nom: Demi-Finales
Finalistes: 4
Thème: 🥈 Argent
Points: ×1.5
Jokers: 1× de chaque
```

### Exemple 2 : Mega Finale Épique
```
Nom: MEGA FINALE
Finalistes: 8
Thème: 🌈 Arc-en-ciel
Points: ×3.0 (TRIPLE!)
Bonus 1ère: +100 pts
Jokers: 3× de chaque
```

### Exemple 3 : Battle Pure (Sans Jokers)
```
Nom: Battle Royale Pure
Finalistes: 6
Thème: ❤️ Rouge
Points: ×2.0
Jokers: TOUS DÉSACTIVÉS ☐
Vote public: DÉSACTIVÉ
```

---

## ❓ DÉPANNAGE

### Problème : "Aucune finale trouvée"
**Solution :** Exécutez `TEST_FINALE_COMPLETE.sql`

### Problème : "Erreur: column 'name' does not exist"
**Solution :** Exécutez d'abord `20251113000001_finale_customization.sql`

### Problème : "Pas assez d'équipes"
**Solution :** Créez au moins 4 équipes dans votre session de jeu

### Problème : "Les jokers ne s'affichent pas"
**Solution :** Vérifiez que :
1. La finale est à l'état "active" (pas "pending" ou "intro")
2. L'équipe fait partie des finalistes
3. Les jokers ont été créés (vérifiez avec `SELECT * FROM final_jokers`)

### Problème : "L'intro ne s'affiche pas"
**Solution :** Vérifiez que :
1. La finale est à l'état "intro" ou "active"
2. Le `game_state.final_mode = true`
3. Le `game_state.final_id` correspond à votre finale

---

## 📊 VÉRIFICATIONS SQL UTILES

### Vérifier l'état de la finale
```sql
SELECT * FROM finals WHERE game_session_id = 'VOTRE_SESSION_ID';
```

### Vérifier les jokers
```sql
SELECT
  t.name as team,
  jt.icon,
  jt.name as joker,
  fj.quantity,
  fj.used_count
FROM final_jokers fj
JOIN teams t ON t.id = fj.team_id
JOIN joker_types jt ON jt.id = fj.joker_type_id
WHERE fj.final_id = 'VOTRE_FINAL_ID';
```

### Réinitialiser les jokers (si besoin)
```sql
UPDATE final_jokers
SET used_count = 0
WHERE final_id = 'VOTRE_FINAL_ID';
```

---

## ✅ CHECKLIST COMPLÈTE

- [ ] Migration `20251113000001_finale_customization.sql` appliquée
- [ ] Script de test `TEST_FINALE_COMPLETE.sql` exécuté avec succès
- [ ] Finale visible dans la Régie
- [ ] Introduction lancée et affichée
- [ ] Finale activée
- [ ] Jokers visibles côté client
- [ ] Joker utilisé avec succès
- [ ] Compteur de joker mis à jour

---

## 🎉 SUCCÈS !

Si vous avez coché toutes les cases ci-dessus, votre système de finale est **100% fonctionnel** !

Vous pouvez maintenant créer des finales personnalisées avec :
- ✨ Nombre de finalistes variable
- ✨ Thèmes visuels
- ✨ Multiplicateurs de points
- ✨ Bonus personnalisés
- ✨ Jokers configurables

**Amusez-vous bien ! 🚀**
