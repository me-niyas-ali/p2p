const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Use exact domain in production
    methods: ["GET", "POST"]
  }
});

// Serve static files (your HTML/CSS/JS build)
app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

io.on('connection', (socket) => {
  console.log('New socket connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    const clients = io.sockets.adapter.rooms.get(roomId) || new Set();

    if (clients.size === 1) {
      rooms[socket.id] = roomId;
      socket.emit('init-host');
    } else if (clients.size === 2) {
      rooms[socket.id] = roomId;
      socket.emit('init-guest');
      // Notify both peers
      io.to(roomId).emit('peer-ready');
    } else {
      socket.emit('room-full');
    }
  });

  socket.on('signal', (payload) => {
    const roomId = rooms[socket.id];
    socket.to(roomId).emit('signal', payload);
  });

  socket.on('leave-room', () => {
    const roomId = rooms[socket.id];
    if (roomId) {
      socket.leave(roomId);
      delete rooms[socket.id];
      socket.to(roomId).emit('peer-left');
    }
  });

  socket.on('disconnect', () => {
    const roomId = rooms[socket.id];
    if (roomId) {
      socket.to(roomId).emit('peer-left');
      delete rooms[socket.id];
    }
    console.log('Socket disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
