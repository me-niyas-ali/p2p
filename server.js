const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'https://me-niyas-ali.github.io',
    methods: ['GET', 'POST']
  }
});

const peers = {};

io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  socket.on('register', (username) => {
    peers[socket.id] = { id: socket.id, username, online: true };
    updatePeerList();
  });

  socket.on('signal', ({ targetId, signal }) => {
    if (peers[targetId]) {
      io.to(targetId).emit('signal', { fromId: socket.id, signal });
    }
  });

  socket.on('disconnect', () => {
    delete peers[socket.id];
    updatePeerList();
  });

  function updatePeerList() {
    Object.entries(peers).forEach(([id, selfPeer]) => {
      const visiblePeers = Object.values(peers)
        .filter(p => p.id !== id)
        .map(p => ({ id: p.id, username: p.username, online: true }));
      io.to(id).emit('peer-list', visiblePeers);
    });
  }
});

app.get('/', (_, res) => res.send('🟢 Signaling server running'));
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
