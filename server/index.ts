/**
 * Serveur WebSocket LAN pour mode offline
 * Permet de jouer sans connexion internet (répétitions locales)
 * 
 * Usage: tsx server/index.ts
 */

import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

console.log('🌐 MusicArena LAN Server - Démarrage...');

io.on('connection', (socket) => {
  console.log(`✅ Client connecté: ${socket.id}`);

  // Rejoindre une room (canal)
  socket.on('join', (room: string) => {
    socket.join(room);
    console.log(`📡 ${socket.id} a rejoint la room: ${room}`);
  });

  // Diffuser un événement dans une room
  socket.on('event', ({ room, data }: { room: string; data: any }) => {
    console.log(`📤 Broadcast vers room ${room}:`, data.type || data);
    io.to(room).emit('event', data);
  });

  // Présence (heartbeat)
  socket.on('presence:track', (data: any) => {
    socket.broadcast.emit('presence:update', {
      socketId: socket.id,
      ...data,
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client déconnecté: ${socket.id}`);
    socket.broadcast.emit('presence:leave', { socketId: socket.id });
  });
});

const PORT = process.env.PORT || 8787;

httpServer.listen(PORT, () => {
  console.log(`🚀 Serveur WebSocket LAN actif sur le port ${PORT}`);
  console.log(`📍 URL: ws://localhost:${PORT}`);
  console.log(`\n✨ Prêt pour les connexions locales!\n`);
});
