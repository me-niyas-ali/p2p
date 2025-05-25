const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from "public"
app.use(express.static('public'));

// Room state: roomId => Set of socket ids
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  let currentRoom = null;

  socket.on('join-room', (roomId) => {
    if (!/^\d{4}$/.test(roomId)) {
      socket.emit('error', 'Invalid room ID');
      return;
    }

    // Join room
    socket.join(roomId);
    currentRoom = roomId;

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(socket.id);

    const peerCount = rooms.get(roomId).size;

    // Host = first person in room
    const isHost = peerCount === 1;

    socket.emit('room-joined', { peerCount, isHost });
    io.to(roomId).emit('peer-count', peerCount);

    console.log(`Socket ${socket.id} joined room ${roomId}, peers: ${peerCount}`);
  });

  socket.on('offer', (offer) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('offer', offer);
  });

  socket.on('answer', (answer) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('answer', answer);
  });

  socket.on('ice-candidate', (candidate) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('ice-candidate', candidate);
  });

  socket.on('leave-room', (roomId) => {
    if (!currentRoom) return;
    socket.leave(roomId);
    if (rooms.has(roomId)) {
      rooms.get(roomId).delete(socket.id);
      if (rooms.get(roomId).size === 0) rooms.delete(roomId);
      else io.to(roomId).emit('peer-count', rooms.get(roomId).size);
    }
    currentRoom = null;
    console.log(`Socket ${socket.id} left room ${roomId}`);
  });

  socket.on('disconnect', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(socket.id);
      if (rooms.get(currentRoom).size === 0) {
        rooms.delete(currentRoom);
      } else {
        io.to(currentRoom).emit('peer-count', rooms.get(currentRoom).size);
        io.to(currentRoom).emit('peer-left');
      }
      console.log(`Socket ${socket.id} disconnected and removed from room ${currentRoom}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
