# 🚀 DÉMARRAGE RAPIDE - Système de Finale

Guide ultra-rapide pour activer le système de finale personnalisable.

---

## ⚡ EN 3 ÉTAPES (10 minutes max)

### ÉTAPE 1️⃣ : Migration principale (2 min)

**Dans Supabase Dashboard → SQL Editor → New Query**

1. **Ouvrez** : `supabase/migrations/20251113000001_finale_customization.sql`
2. **Copiez tout** le contenu
3. **Collez** dans SQL Editor
4. **Cliquez** sur **RUN** (ou F5)
5. ✅ Vous devriez voir : `Success. No rows returned`

---

### ÉTAPE 2️⃣ : Créer une finale de test (3 min)

**Toujours dans SQL Editor → New Query**

1. **Ouvrez** : `supabase/migrations/TEST_FINALE_SIMPLE.sql` ⚠️ **UTILISEZ CE FICHIER**
2. **Copiez tout** le contenu
3. **Collez** dans SQL Editor
4. **RUN**
5. ✅ Vous devriez voir dans les NOTICES :
   ```
   ✅ Colonnes de personnalisation détectées
   ✅ Session trouvée: [UUID]
   ✅ Jokers trouvés
   ✅ 8 équipes sélectionnées
   ✅ Finale créée: [UUID]
   ✅ Jokers créés pour toutes les équipes

   🎉 FINALE DE TEST CRÉÉE AVEC SUCCÈS !
   ```

**En bas, dans les résultats, vous verrez un tableau avec votre finale.**

---

### ÉTAPE 3️⃣ : Tester dans l'app (5 min)

1. **Ouvrez la Régie** : `http://localhost:5173/regie`
2. **Scrollez** vers le bas jusqu'à **"Mode Final - Configuration Complète"**
3. **Vous verrez** :
   ```
   ┌──────────────────────────────────────┐
   │ TEST - Finale Personnalisée créée   │
   │ 8 finalistes - Statut: pending      │
   │ ⚡ Points ×2                         │
   │                                      │
   │ [🎬 Lancer l'Introduction]          │
   └──────────────────────────────────────┘
   ```

4. **Cliquez** sur **"🎬 Lancer l'Introduction"**
   - L'écran TV s'affiche avec le thème 🌈 arc-en-ciel
   - Les 8 équipes apparaissent en grille

5. **Cliquez** sur **"🏁 Activer la Finale"**

6. **Testez les jokers** :
   - Ouvrez `http://localhost:5173/client`
   - Connectez-vous avec une équipe finaliste
   - Vous verrez : `⚡ Jokers [➗ 2/2] [👥 1/1] [🗳️ 3/3]`
   - Cliquez sur un joker → Il marche ! ✅

---

## ⚠️ FICHIERS IMPORTANTS

### Pour Supabase SQL Editor :
- ✅ `TEST_FINALE_SIMPLE.sql` ← **UTILISEZ CELUI-CI** (Version ultra-simple, tout dans 1 bloc)
- `TEST_FINALE_SUPABASE.sql` ← Alternative (peut avoir des problèmes sur certaines configs)

### Pour psql (ligne de commande) :
- `TEST_FINALE_COMPLETE.sql` ← Seulement si vous utilisez psql

**Recommandation :** Utilisez toujours `TEST_FINALE_SIMPLE.sql` dans Supabase SQL Editor.

---

## 🎨 CRÉER VOTRE PROPRE FINALE

Une fois le test validé, dans la Régie :

1. **Cliquez** sur **"Désactiver"** (pour supprimer la finale de test)
2. **Configurez** vos paramètres :
   - **Nom** : "Ma Super Finale"
   - **Finalistes** : 6 équipes (ou autre)
   - **Thème** : 🥇 Or
   - **Points** : ×3.0 (triple !)
   - **Jokers** : ☑️ fifty_fifty ×2, ☑️ team_call ×1, ☐ public_vote (désactivé)
3. **Cliquez** sur **"🏆 Créer Ma Super Finale"**

---

## 📊 EXEMPLES DE CONFIGURATIONS

### Demi-Finale Classique
```
Nom: Demi-Finales
Finalistes: 4
Thème: 🥈 Argent
Points: ×1.5
Bonus 1ère: 25
Jokers: 1× de chaque
```

### Mega Finale Épique
```
Nom: MEGA FINALE
Finalistes: 8
Thème: 🌈 Arc-en-ciel
Points: ×3.0
Bonus 1ère: 100
Jokers: 3× de chaque
```

### Battle Pure (Sans Jokers)
```
Nom: Battle Royale Pure
Finalistes: 6
Thème: ❤️ Rouge
Points: ×2.0
Jokers: TOUS DÉSACTIVÉS ☐
Vote public: DÉSACTIVÉ
```

---

## ❌ PROBLÈMES COURANTS

### "Aucune session de jeu active"
→ Créez une session de jeu active dans la Régie

### "Pas assez d'équipes"
→ Créez au moins 4 équipes avec des scores

### "Erreur SQL syntax"
→ Vérifiez que vous utilisez **TEST_FINALE_SUPABASE.sql** (pas TEST_FINALE_COMPLETE.sql)

### "La finale ne s'affiche pas"
→ Actualisez la page de la Régie (F5)

### "Les jokers ne s'affichent pas côté client"
→ Vérifiez que :
  1. La finale est en statut **"active"** (pas "pending" ou "intro")
  2. L'équipe fait partie des finalistes
  3. Actualisez la page client (F5)

---

## 📖 POUR ALLER PLUS LOIN

**Guide complet** : `GUIDE_TEST_FINALE.md`
- Instructions détaillées
- Dépannage approfondi
- Requêtes SQL de vérification

---

## ✅ CHECKLIST RAPIDE

- [ ] Migration `20251113000001_finale_customization.sql` appliquée
- [ ] Script `TEST_FINALE_SUPABASE.sql` exécuté avec succès
- [ ] Finale visible dans la Régie
- [ ] Introduction lancée et thème arc-en-ciel affiché
- [ ] Finale activée
- [ ] Jokers visibles côté client
- [ ] Joker utilisé avec succès

**Si tout est coché → C'est bon ! 🎉**

---

**Bon jeu ! 🎮🏆**
