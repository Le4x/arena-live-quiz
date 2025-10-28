import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, 'state.json');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// État du jeu en mémoire
let gameState = {
  sessionId: null,
  teams: [],
  question: null,
  phase: 'idle',
  timer: { running: false, seconds: 0 },
  firstBuzz: null,
  buzzerLocked: false,
  showLeaderboard: false,
  showRoundIntro: false,
  currentRound: null,
  answers: []
};

// Charger l'état au démarrage
async function loadState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    gameState = JSON.parse(data);
    console.log('✅ État chargé depuis state.json');
  } catch (error) {
    console.log('ℹ️ Aucun état sauvegardé, démarrage avec état vide');
  }
}

// Sauvegarder l'état toutes les 5 secondes
async function saveState() {
  try {
    await fs.writeFile(STATE_FILE, JSON.stringify(gameState, null, 2));
    console.log('💾 État sauvegardé');
  } catch (error) {
    console.error('❌ Erreur sauvegarde:', error);
  }
}

setInterval(saveState, 5000);

// Gestion des connexions
io.on('connection', (socket) => {
  console.log(`🔌 Client connecté: ${socket.id}`);

  // Envoyer l'état complet au nouveau client
  socket.emit('state:full', gameState);

  // === ÉVÉNEMENTS RÉGIE ===
  socket.on('regie:update', (partial) => {
    gameState = { ...gameState, ...partial };
    io.emit('state:update', partial);
  });

  socket.on('regie:lock', () => {
    gameState.buzzerLocked = true;
    gameState.phase = 'locked';
    io.emit('regie:locked');
  });

  socket.on('regie:unlock', () => {
    gameState.buzzerLocked = false;
    gameState.phase = 'playing';
    gameState.firstBuzz = null;
    io.emit('regie:unlocked');
  });

  socket.on('regie:score', ({ teamId, delta }) => {
    const team = gameState.teams.find(t => t.id === teamId);
    if (team) {
      team.score = Math.max(0, team.score + delta);
      io.emit('score:update', { teamId, score: team.score });
      io.emit('state:update', { teams: gameState.teams });
    }
  });

  socket.on('regie:timer', ({ action, seconds }) => {
    if (action === 'start') {
      gameState.timer.running = true;
      gameState.timer.seconds = seconds || gameState.timer.seconds;
    } else if (action === 'stop') {
      gameState.timer.running = false;
    } else if (action === 'reset') {
      gameState.timer.running = false;
      gameState.timer.seconds = seconds || 0;
    }
    io.emit('state:update', { timer: gameState.timer });
  });

  // === ÉVÉNEMENTS CLIENT ===
  socket.on('client:buzz', ({ teamId, ts }) => {
    // Si pas de question ou déjà locked, ignorer
    if (!gameState.question || gameState.buzzerLocked) {
      socket.emit('buzz:late', { teamId, ts });
      return;
    }

    // Premier buzz
    if (!gameState.firstBuzz) {
      gameState.firstBuzz = teamId;
      gameState.buzzerLocked = true;
      gameState.phase = 'locked';
      io.emit('buzz:first', { teamId, ts });
      console.log(`🔔 Premier buzz: équipe ${teamId}`);
    } else {
      // Buzz tardif
      socket.emit('buzz:late', { teamId, ts });
    }
  });

  socket.on('client:answer', ({ teamId, payload }) => {
    const answer = {
      id: Date.now().toString(),
      teamId,
      questionId: gameState.question?.id,
      answer: payload,
      timestamp: new Date().toISOString()
    };
    gameState.answers.push(answer);
    io.emit('state:update', { answers: gameState.answers });
  });

  // === GESTION ÉQUIPES ===
  socket.on('team:create', ({ team }) => {
    const existingTeam = gameState.teams.find(t => t.id === team.id);
    if (!existingTeam) {
      gameState.teams.push(team);
      io.emit('state:update', { teams: gameState.teams });
    }
  });

  socket.on('team:update', ({ teamId, updates }) => {
    const team = gameState.teams.find(t => t.id === teamId);
    if (team) {
      Object.assign(team, updates);
      io.emit('state:update', { teams: gameState.teams });
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client déconnecté: ${socket.id}`);
  });
});

// API REST pour export/import
app.use(express.json({ limit: '10mb' }));

app.get('/api/export', (req, res) => {
  res.json(gameState);
});

app.post('/api/import', (req, res) => {
  gameState = req.body;
  io.emit('state:full', gameState);
  saveState();
  res.json({ success: true });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', clients: io.engine.clientsCount });
});

// Démarrage serveur
const PORT = process.env.PORT || 3001;

loadState().then(() => {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 Serveur WebSocket Arena Live démarré
📍 Port: ${PORT}
🌐 Accessible sur le réseau local
💾 Autosave activé (toutes les 5s)
    `);
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏹️ Arrêt du serveur...');
  await saveState();
  process.exit(0);
});
