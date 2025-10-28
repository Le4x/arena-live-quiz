# Arena Live - Mode Local Offline

## 🎯 Installation

### 1. Installer les dépendances

```bash
# Frontend
npm install

# Serveur WebSocket
cd server
npm install
cd ..
```

### 2. Installer socket.io-client dans le frontend

```bash
npm install socket.io-client
```

### 3. Configuration

Éditez `.env.local` et remplacez l'IP par celle de votre machine :

```bash
VITE_WS_URL=http://VOTRE_IP:3001
VITE_REGIE_TOKEN=your-secure-regie-token
VITE_CLIENT_TOKEN=your-secure-client-token
```

⚠️ **IMPORTANT - Sécurité** : Changez les tokens par défaut pour sécuriser votre serveur local !

Pour trouver votre IP locale :
- **Windows** : `ipconfig` (cherchez "Adresse IPv4")
- **Mac/Linux** : `ifconfig` ou `ip addr`

### 4. Configuration serveur

Créez un fichier `server/.env` :

```bash
REGIE_TOKEN=your-secure-regie-token
CLIENT_TOKEN=your-secure-client-token
PORT=3001
```

Les tokens doivent correspondre à ceux du `.env.local` du frontend.

## 🚀 Démarrage

### Terminal 1 : Serveur WebSocket

```bash
cd server
npm start
```

Le serveur démarre sur le port 3001 et affiche :
```
🚀 Serveur WebSocket Arena Live démarré
📍 Port: 3001
🌐 Accessible sur le réseau local
💾 Autosave activé (toutes les 5s)
```

### Terminal 2 : Frontend

```bash
npm run dev
```

Le frontend démarre sur le port 5173.

## 📱 Accès clients

Les smartphones doivent être sur le **même réseau Wi-Fi** que l'ordinateur serveur.

URL clients :
```
http://VOTRE_IP:5173/client
```

Exemple : `http://192.168.50.10:5173/client`

## ⌨️ Raccourcis clavier (Régie)

| Touche | Action |
|--------|--------|
| `Space` | Start/Pause chrono |
| `N` | Question suivante |
| `B` | Lock/Unlock buzzer |
| `C` | Correct (+points) |
| `I` | Incorrect |
| `←` / `→` | -1 / +1 point |

## 🔧 Architecture

```
[Serveur WebSocket]  ←→  [Frontend Régie]
         ↕                      ↕
  [state.json]          [Clients mobiles]
                              ↕
                        [Écran public]
```

### État sauvegardé

Le fichier `server/state.json` contient :
- Teams et scores
- Question en cours
- Phase de jeu (idle/playing/locked)
- Timer
- Premier buzz
- Réponses

Sauvegarde automatique toutes les 5 secondes.

## 📤 Export / Import

### Export

1. Cliquer sur "Export JSON" dans l'interface
2. Le fichier `arena-live-TIMESTAMP.json` est téléchargé

### Import

1. Cliquer sur "Import JSON"
2. Sélectionner un fichier précédemment exporté
3. L'état est restauré et l'application redémarre

## 🧪 Tests d'acceptation

✅ **Test 1** : 8 équipes, 5 téléphones → tous reçoivent l'état  
✅ **Test 2** : Question buzzer → lock sur premier buzz  
✅ **Test 3** : Déverrouillage → nouvelle question → chrono OK  
✅ **Test 4** : Déconnexion Wi-Fi → reconnexion auto  
✅ **Test 5** : Export → relance → Import → état restauré  
✅ **Test 6** : Scores ajustables au clavier en temps réel  
✅ **Test 7** : Fonctionne sans Internet (LAN pur)  

## 🐛 Dépannage

### Le serveur ne démarre pas

```bash
# Vérifier que le port 3001 est libre
# Windows
netstat -an | find "3001"

# Mac/Linux
lsof -i :3001
```

### Les clients ne se connectent pas

1. Vérifier que serveur et clients sont sur le même Wi-Fi
2. Vérifier l'IP dans `.env.local`
3. Désactiver le pare-feu temporairement
4. Tester avec : `http://VOTRE_IP:3001/api/health`

### Perte de connexion

La bannière jaune/rouge en haut de l'écran indique l'état de connexion.  
La reconnexion est automatique (tentatives infinies).

## 📊 API REST

Le serveur expose également une API REST :

- `GET /api/export` - Export de l'état complet
- `POST /api/import` - Import d'un état
- `GET /api/health` - Vérifier le statut du serveur

## 🔒 Sécurité

✅ **Authentification par tokens** implémentée :
- Deux rôles séparés : `regie` (contrôle total) et `client` (buzz/réponses uniquement)
- Les tokens doivent être configurés dans `.env.local` (frontend) et `server/.env` (serveur)
- Chaque client ne peut buzzer/répondre que pour son équipe assignée
- Rate limiting automatique pour prévenir les abus
- API REST protégée par token pour export/import

⚠️ **Ce système reste conçu pour un réseau local fermé uniquement.**  
Ne pas exposer le serveur sur Internet sans sécurité additionnelle (HTTPS, tokens forts, etc.)!
