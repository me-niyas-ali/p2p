const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'https://me-niyas-ali.github.io',
    methods: ['GET', 'POST']
  }
});

// Store all peers
let peers = {};

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // When a user joins with a username
  socket.on('register', (username) => {
    peers[socket.id] = { id: socket.id, username, online: true };
    broadcastPeers();
  });

  // Forward signals between peers
  socket.on('signal', (data) => {
    const { targetId, signal } = data;
    if (peers[targetId]) {
      io.to(targetId).emit('signal', {
        fromId: socket.id,
        signal
      });
    }
  });

  // Send updated peer list to each client excluding themselves
  const broadcastPeers = () => {
    Object.keys(peers).forEach((id) => {
      const visiblePeers = Object.values(peers)
        .filter(p => p.id !== id)
        .map(p => ({ id: p.id, username: p.username, online: p.online }));
      io.to(id).emit('peer-list', visiblePeers);
    });
  };

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);
    delete peers[socket.id];
    broadcastPeers();
  });
});

app.get('/', (req, res) => {
  res.send('🔧 P2P Signaling Server is Running');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
