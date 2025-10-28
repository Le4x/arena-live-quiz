# Arena Live

Application de quiz interactif en temps réel pour événements live.

## 🎮 Modes de fonctionnement

### Mode Cloud (par défaut)
Utilise Lovable Cloud (Supabase) pour la synchronisation en temps réel.

### Mode Local Offline ⭐ NOUVEAU
**Pour événements sans connexion Internet stable.**

Serveur WebSocket local + zéro dépendance cloud.

📖 [Documentation complète du mode local](README-LOCAL.md)

## 🚀 Démarrage rapide

### Mode Cloud

```bash
npm install
npm run dev
```

### Mode Local

```bash
# Terminal 1: Serveur WebSocket
cd server
npm install
npm start

# Terminal 2: Frontend
npm install
npm run dev
```

Configurez l'IP locale dans `.env.local`:
```bash
VITE_WS_URL=http://VOTRE_IP:3001
```

## 📁 Structure

```
arena-live/
├── server/              # Serveur WebSocket local (mode offline)
│   ├── index.js
│   └── package.json
├── src/
│   ├── pages/
│   │   ├── RegieLocal.tsx   # Régie mode local
│   │   ├── RegieVideo.tsx   # Régie mode cloud
│   │   ├── Client.tsx       # Interface clients
│   │   └── Screen.tsx       # Affichage public
│   ├── lib/
│   │   └── realtime.ts      # Client WebSocket
│   └── components/
└── README-LOCAL.md      # Documentation mode local
```

## 🌐 Routes

| Route | Description |
|-------|-------------|
| `/regie/local` | Régie mode offline |
| `/regie/video` | Régie mode cloud |
| `/regie/sound` | Régie son |
| `/client` | Interface équipes |
| `/screen` | Affichage public |

## 🔧 Technologies

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Cloud**: Supabase (Lovable Cloud)
- **Local**: Node.js, Express, Socket.IO

## 📖 Documentation

- [Mode Local Offline](README-LOCAL.md) - Guide complet installation locale
- [Lovable Docs](https://docs.lovable.dev)

---

**URL Projet**: https://lovable.dev/projects/4f58f6bc-1178-44ec-8309-edff0107ca29
