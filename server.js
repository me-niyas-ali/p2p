const express = require('express');
const http = require('http');
const path = require('path');
const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Track users per room
const rooms = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-room', (roomId) => {
    roomId = roomId.trim();
    if (!roomId) return;

    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);

    // Add to room tracking
    if (!rooms[roomId]) rooms[roomId] = new Set();
    rooms[roomId].add(socket.id);

    // Notify this socket
    socket.emit('room-joined', roomId);

    // Broadcast user count to room
    io.to(roomId).emit('update-user-count', rooms[roomId].size);
  });

  socket.on('leave-room', (roomId) => {
    roomId = roomId.trim();
    socket.leave(roomId);
    console.log(`Socket ${socket.id} left room ${roomId}`);

    if (rooms[roomId]) {
      rooms[roomId].delete(socket.id);
      if (rooms[roomId].size === 0) {
        delete rooms[roomId];
      } else {
        io.to(roomId).emit('update-user-count', rooms[roomId].size);
      }
    }

    socket.emit('room-left');
  });

  socket.on('file-meta', ({ roomId, fileName, fileSize }) => {
    // Broadcast to everyone else in room except sender
    socket.to(roomId).emit('file-meta', { fileName, fileSize });
  });

  socket.on('file-chunk', ({ roomId, chunk, offset }) => {
    // chunk is sent as ArrayBuffer - no changes needed
    socket.to(roomId).emit('file-chunk', { chunk, offset });
  });

  socket.on('send-cancel', (roomId) => {
    socket.to(roomId).emit('send-cancel');
  });

  socket.on('disconnecting', () => {
    // Remove from all rooms
    const userRooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    userRooms.forEach(roomId => {
      if (rooms[roomId]) {
        rooms[roomId].delete(socket.id);
        if (rooms[roomId].size === 0) {
          delete rooms[roomId];
        } else {
          io.to(roomId).emit('update-user-count', rooms[roomId].size);
        }
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
