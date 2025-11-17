# 🎯 Gestion Multi-Sessions Clients - Guide d'Installation

## 📋 Vue d'ensemble

Ce système permet de gérer plusieurs événements clients simultanés avec :
- ✅ Création de sessions personnalisées
- ✅ Génération automatique de QR codes et kits clients
- ✅ Page de connexion publique branded
- ✅ Gestion des informations clients et facturation
- ✅ Templates d'instructions personnalisables

---

## 🚀 Installation

### Étape 1 : Appliquer la Migration Base de Données

La migration `/supabase/migrations/20251117000000_add_client_session_management.sql` doit être appliquée à votre base Supabase.

**Option A : Via Supabase Dashboard (Recommandé)**
1. Ouvrez votre projet Supabase : https://app.supabase.com
2. Allez dans `SQL Editor`
3. Copiez le contenu du fichier `/supabase/migrations/20251117000000_add_client_session_management.sql`
4. Collez-le dans l'éditeur SQL
5. Cliquez sur `Run`

**Option B : Via Supabase CLI**
```bash
supabase db push
```

### Étape 2 : Vérifier l'Installation

Vérifiez que la migration a fonctionné :
```sql
-- Dans SQL Editor
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'game_sessions'
AND column_name IN ('access_code', 'client_name', 'branding_primary_color');
```

Vous devriez voir 3 colonnes retournées.

---

## 📖 Utilisation

### 1. Accéder au Dashboard Sessions

Depuis la page d'accueil, cliquez sur **"Sessions Clients"** ou naviguez vers `/sessions`

### 2. Créer une Nouvelle Session

1. Cliquez sur **"Nouvelle Session"**
2. Remplissez le formulaire :
   - **Informations de la Session** :
     - Nom (ex: "Soirée Quiz TotalEnergies")
     - Type (Quiz, Blindtest, ou Mixte)
     - Date et heure de l'événement
     - Lieu
     - Nombre maximum d'équipes

   - **Informations Client** :
     - Nom du contact
     - Entreprise
     - Email
     - Téléphone
     - Adresse de facturation

   - **Personnalisation** :
     - Couleurs primaire et secondaire (branding)
     - Instructions personnalisées pour les joueurs
     - Notes internes (non visibles)

3. Cliquez sur **"Créer la Session"**

Un **code d'accès unique** sera généré automatiquement (format : `XXXX-YYYY-ZZZZ`)

### 3. Générer et Télécharger le Kit Client

Après création, vous serez automatiquement redirigé vers la page **Kit Client**.

Cette page contient :
- 📱 **QR Code** téléchargeable (PNG haute résolution)
- 🔗 **Lien direct** copiable : `https://votre-domaine.com/join/XXXX-YYYY-ZZZZ`
- 📄 **PDF complet** avec toutes les instructions

**Actions disponibles :**
- **Télécharger QR Code** : PNG 600x600px
- **Télécharger Kit PDF** : Document complet avec QR code, instructions, infos client
- **Copier le lien** : Pour envoi par email/SMS

### 4. Transmettre le Kit au Client

Vous pouvez envoyer au client :
- Le PDF complet
- Le QR code + lien séparément
- Le code d'accès uniquement (format : `XXXX-YYYY-ZZZZ`)

### 5. Connexion des Joueurs

Les joueurs peuvent rejoindre de 3 façons :

**A. Scanner le QR Code**
- Le QR code redirige vers `/join/XXXX-YYYY-ZZZZ`
- Affichage automatique des infos de la session
- Bouton "Rejoindre la Session"

**B. Utiliser le lien direct**
- Partager `https://votre-domaine.com/join/XXXX-YYYY-ZZZZ`
- Même expérience que le QR code

**C. Entrer le code manuellement**
- Aller sur `https://votre-domaine.com/join`
- Saisir le code `XXXX-YYYY-ZZZZ`
- Valider

### 6. Démarrer la Session

Depuis le dashboard Sessions :
1. Trouvez votre session dans la liste
2. Cliquez sur **"Démarrer"**
3. Vous serez redirigé vers la **Régie** avec la session pré-sélectionnée

---

## 🎨 Personnalisation Avancée

### Branding Client

Chaque session peut avoir :
- **Couleur primaire** : Utilisée pour le QR code, boutons, header
- **Couleur secondaire** : Dégradés, accents
- **Logo** : Affiché sur la page de connexion (à venir)
- **Image de fond** : Personnalisation complète (à venir)

### Instructions Personnalisées

Template par défaut si vide :
```
1. Scannez le QR code ou utilisez le lien
2. Créez votre équipe
3. Attendez le démarrage de la session
4. Bonne chance !
```

Vous pouvez personnaliser pour inclure :
- Règles spécifiques du client
- Informations de contact support
- Prizes/dotations
- Règlement particulier

---

## 🔧 Structure Technique

### Nouveaux Champs `game_sessions`

```sql
access_code              TEXT UNIQUE      -- Code auto-généré XXXX-YYYY-ZZZZ
client_name              TEXT             -- Contact client
client_email             TEXT             -- Email facturation
client_phone             TEXT             -- Téléphone
client_company           TEXT             -- Entreprise
client_address           TEXT             -- Adresse facturation
event_date               TIMESTAMPTZ      -- Date/heure événement
event_location           TEXT             -- Lieu physique
event_description        TEXT             -- Description publique
max_teams                INTEGER          -- Limite joueurs (défaut: 20)
custom_instructions      TEXT             -- Instructions personnalisées
branding_primary_color   TEXT             -- Couleur hex primaire
branding_secondary_color TEXT             -- Couleur hex secondaire
branding_logo_url        TEXT             -- URL logo client
branding_background_url  TEXT             -- URL background
session_type             TEXT             -- quiz|blindtest|mixed
is_public                BOOLEAN          -- Visibilité publique
qr_code_url              TEXT             -- URL QR code stocké
notes                    TEXT             -- Notes internes
```

### Nouvelles Routes

```
/sessions                           → Dashboard gestion (protégé)
/sessions/:sessionId/kit            → Page kit client (protégé)
/join                               → Saisie manuelle code (public)
/join/:accessCode                   → Page connexion directe (public)
```

### Composants Créés

```
/src/components/session-manager/
  ├── QRCodeGenerator.tsx          → Génération QR + téléchargement
  └── CreateSessionForm.tsx        → Formulaire création session

/src/pages/
  ├── SessionsManager.tsx          → Dashboard multi-sessions
  ├── ClientKit.tsx                → Page génération kit
  └── JoinSession.tsx              → Page connexion publique

/src/hooks/
  └── useClientSessions.ts         → Hook CRUD sessions
```

---

## 📊 Cas d'Usage

### Scénario 1 : Événement Entreprise

**Client** : TotalEnergies
**Besoin** : Quiz team-building pour 40 personnes
**Process** :
1. Créer session "Team Building TotalEnergies 2025"
2. Configurer couleurs corporate (vert/bleu)
3. Max 40 équipes
4. Instructions : "Formez des équipes de 3-4 personnes"
5. Générer kit → Envoyer PDF au RH
6. Le jour J : Les participants scannent le QR à l'entrée
7. Démarrer depuis la Régie

### Scénario 2 : Multi-Sessions Simultanées

**Samedi 20h** :
- Session A : Anniversaire Marie (20 joueurs)
- Session B : Soirée Bar Le Comptoir (30 joueurs)

Chaque session a :
- Son propre code d'accès
- Ses propres joueurs isolés
- Son branding unique
- Géré depuis 2 onglets Régie séparés

### Scénario 3 : Événement Récurrent

**Quiz Mensuel Bar** :
1. Template pré-configuré (couleurs, instructions)
2. Créer nouvelle session chaque mois
3. Poster QR code sur Facebook
4. Limite 25 équipes
5. Inscription "premier arrivé, premier servi"

---

## ❓ FAQ

### Comment modifier une session après création ?
Actuellement, utilisez l'API directement. Interface d'édition à venir.

### Les joueurs peuvent-ils rejoindre avant la date ?
Oui ! Le code d'accès est valide dès la création. Vous pouvez créer la session des semaines à l'avance.

### Puis-je réutiliser un code d'accès ?
Non, les codes sont uniques et générés aléatoirement. Mais vous pouvez recréer une session avec le même nom.

### Combien de sessions puis-je créer ?
Illimité ! Mais seule une session peut être "active" à la fois par animateur (limitation interface Régie).

### Les anciennes sessions sont-elles supprimées ?
Non, elles sont archivées avec statut "completed". Vous pouvez les consulter dans le dashboard.

---

## 🐛 Problèmes Connus

- [ ] Pas d'interface d'édition de session (workaround : recréer)
- [ ] Upload de logo client pas encore implémenté
- [ ] Emails automatiques pas configurés
- [ ] Limite de connexions simultanées non testée à grande échelle

---

## 🚧 Roadmap

### V1.1 (À venir)
- [ ] Interface d'édition de sessions
- [ ] Upload de logos clients
- [ ] Templates de sessions réutilisables
- [ ] Statistiques par session (taux de participation, etc.)

### V1.2 (Futur)
- [ ] Envoi automatique du kit par email
- [ ] Page publique "Catalogue" des sessions ouvertes
- [ ] Paiement en ligne (Stripe) pour sessions payantes
- [ ] Système de réservation avec places limitées

---

## 📞 Support

Pour toute question :
1. Vérifier ce README
2. Consulter `/ARCHITECTURE.md` pour détails techniques
3. Ouvrir une issue GitHub

---

**Dernière mise à jour** : 17 Novembre 2025
**Version** : 1.0.0
