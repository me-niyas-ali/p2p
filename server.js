// server.js
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

const rooms = {};

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);
    
    const isHost = rooms[roomId][0] === socket.id;
    io.to(socket.id).emit('room-joined', { host: isHost, peerId: socket.id });
    io.to(roomId).emit('peer-count', rooms[roomId].length);

    socket.on('leave-room', () => {
      socket.leave(roomId);
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      io.to(roomId).emit('peer-count', rooms[roomId].length);
    });

    socket.on('disconnect', () => {
      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
        io.to(roomId).emit('peer-count', rooms[roomId].length);
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
