# ✅ PRÉREQUIS - Système de Finale

**IMPORTANT :** Avant d'exécuter le script `SETUP_COMPLETE_FINALE.sql`, vous devez avoir :

---

## 📋 LISTE DES PRÉREQUIS

### ✅ 1. Une session de jeu ACTIVE

**Vérification :**
```sql
-- Dans Supabase SQL Editor
SELECT id, name, status FROM game_sessions ORDER BY created_at DESC LIMIT 5;
```

**Résultat attendu :**
- Au moins 1 ligne avec `status = 'active'`

**Si vous n'avez pas de session active :**
1. Allez dans la **Régie** (`http://localhost:5173/regie`)
2. Dans la section **Sessions de jeu**
3. Créez une nouvelle session OU
4. Activez une session existante

---

### ✅ 2. Au moins 4 équipes avec des SCORES

**Vérification :**
```sql
-- Dans Supabase SQL Editor
SELECT id, name, score, is_active FROM teams ORDER BY score DESC;
```

**Résultat attendu :**
- Au moins **4 équipes**
- Chaque équipe doit avoir un **score > 0** (recommandé)

**Si vous n'avez pas assez d'équipes :**

#### Option A : Créer des équipes de test via SQL

```sql
-- Créer 8 équipes de test avec des scores
INSERT INTO teams (name, color, score, is_active, game_session_id)
SELECT
  'Équipe ' || i,
  CASE
    WHEN i = 1 THEN '#FF0000'
    WHEN i = 2 THEN '#00FF00'
    WHEN i = 3 THEN '#0000FF'
    WHEN i = 4 THEN '#FFFF00'
    WHEN i = 5 THEN '#FF00FF'
    WHEN i = 6 THEN '#00FFFF'
    WHEN i = 7 THEN '#FFA500'
    ELSE '#800080'
  END,
  (100 - (i * 10)) + floor(random() * 20), -- Scores aléatoires
  true,
  (SELECT id FROM game_sessions WHERE status = 'active' LIMIT 1)
FROM generate_series(1, 8) AS i;
```

#### Option B : Créer des équipes via l'interface

1. Allez dans **Client** (`http://localhost:5173/client`)
2. Créez 4 à 8 équipes
3. Donnez-leur des scores en jouant quelques questions

---

### ✅ 3. Table game_sessions existe

**Vérification :**
```sql
SELECT COUNT(*) FROM game_sessions;
```

**Si erreur :** Votre schéma de base n'est pas complet. Le script `SETUP_COMPLETE_FINALE.sql` ne peut pas créer cette table car elle dépend d'autres éléments.

**Solution :** Assurez-vous d'avoir exécuté toutes les migrations initiales de votre projet.

---

### ✅ 4. Table teams existe

**Vérification :**
```sql
SELECT COUNT(*) FROM teams;
```

**Si erreur :** Même chose que pour game_sessions - migrations initiales manquantes.

---

## 🚀 SCRIPT DE VÉRIFICATION COMPLET

Copiez-collez ce script dans Supabase SQL Editor pour **tout vérifier en une fois** :

```sql
DO $$
DECLARE
  v_session_count INTEGER;
  v_active_session_count INTEGER;
  v_team_count INTEGER;
  v_teams_with_score INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '🔍 VÉRIFICATION DES PRÉREQUIS';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '';

  -- Vérifier les sessions
  BEGIN
    SELECT COUNT(*) INTO v_session_count FROM game_sessions;
    SELECT COUNT(*) INTO v_active_session_count FROM game_sessions WHERE status = 'active';

    RAISE NOTICE '📊 Sessions de jeu:';
    RAISE NOTICE '  Total: %', v_session_count;
    RAISE NOTICE '  Actives: %', v_active_session_count;

    IF v_active_session_count = 0 THEN
      RAISE NOTICE '  ❌ PROBLÈME: Aucune session active !';
      RAISE NOTICE '  → Solution: Créez/activez une session dans la Régie';
    ELSE
      RAISE NOTICE '  ✅ OK';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  ❌ ERREUR: Table game_sessions introuvable';
    RAISE NOTICE '  → Solution: Migrations initiales manquantes';
  END;

  RAISE NOTICE '';

  -- Vérifier les équipes
  BEGIN
    SELECT COUNT(*) INTO v_team_count FROM teams;
    SELECT COUNT(*) INTO v_teams_with_score FROM teams WHERE score > 0;

    RAISE NOTICE '👥 Équipes:';
    RAISE NOTICE '  Total: %', v_team_count;
    RAISE NOTICE '  Avec score > 0: %', v_teams_with_score;

    IF v_team_count < 4 THEN
      RAISE NOTICE '  ❌ PROBLÈME: Moins de 4 équipes !';
      RAISE NOTICE '  → Solution: Créez des équipes (voir PREREQUISITES_FINALE.md)';
    ELSE
      RAISE NOTICE '  ✅ OK';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '  ❌ ERREUR: Table teams introuvable';
    RAISE NOTICE '  → Solution: Migrations initiales manquantes';
  END;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';

  -- Résumé final
  IF v_active_session_count > 0 AND v_team_count >= 4 THEN
    RAISE NOTICE '✅ TOUS LES PRÉREQUIS SONT REMPLIS !';
    RAISE NOTICE 'Vous pouvez exécuter SETUP_COMPLETE_FINALE.sql';
  ELSE
    RAISE NOTICE '❌ PRÉREQUIS MANQUANTS';
    RAISE NOTICE 'Corrigez les problèmes ci-dessus avant de continuer';
  END IF;

  RAISE NOTICE '═══════════════════════════════════════';
END $$;
```

---

## ✅ RÉSULTAT ATTENDU

Si tout est OK, vous devriez voir :

```
🔍 VÉRIFICATION DES PRÉREQUIS

📊 Sessions de jeu:
  Total: 1
  Actives: 1
  ✅ OK

👥 Équipes:
  Total: 8
  Avec score > 0: 8
  ✅ OK

═══════════════════════════════════════
✅ TOUS LES PRÉREQUIS SONT REMPLIS !
Vous pouvez exécuter SETUP_COMPLETE_FINALE.sql
═══════════════════════════════════════
```

---

## 🔧 SOLUTIONS RAPIDES

### Créer tout rapidement via SQL :

```sql
-- 1. Créer une session active (si elle n'existe pas)
INSERT INTO game_sessions (name, status, selected_rounds, has_final)
VALUES ('Session Test', 'active', '[]'::jsonb, true)
ON CONFLICT DO NOTHING;

-- 2. Créer 8 équipes avec scores
INSERT INTO teams (name, color, score, is_active, game_session_id)
SELECT
  'Équipe ' || i,
  CASE
    WHEN i = 1 THEN '#FF0000'
    WHEN i = 2 THEN '#00FF00'
    WHEN i = 3 THEN '#0000FF'
    WHEN i = 4 THEN '#FFFF00'
    WHEN i = 5 THEN '#FF00FF'
    WHEN i = 6 THEN '#00FFFF'
    WHEN i = 7 THEN '#FFA500'
    ELSE '#800080'
  END,
  100 - (i * 5), -- Scores décroissants
  true,
  (SELECT id FROM game_sessions WHERE status = 'active' LIMIT 1)
FROM generate_series(1, 8) AS i
ON CONFLICT DO NOTHING;
```

---

## 📝 ORDRE D'EXÉCUTION COMPLET

1. **Vérifier les prérequis** : Script de vérification ci-dessus
2. **Corriger ce qui manque** : Sessions et/ou équipes
3. **Re-vérifier** : Réexécuter le script de vérification
4. **Installer le système** : `SETUP_COMPLETE_FINALE.sql`
5. **Tester** : Dans la Régie → Mode Final

---

**Une fois tous les prérequis remplis, suivez `QUICK_START.md` !**
