const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files (put your frontend build here or HTML file in /public)
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

const rooms = {}; // roomId -> Set of socket ids

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join-room', (roomId) => {
    if (!roomId || typeof roomId !== 'string') return;

    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = new Set();
    rooms[roomId].add(socket.id);

    // Notify all in the room about updated device count
    const deviceCount = rooms[roomId].size;
    io.to(roomId).emit('device-count', deviceCount);

    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('leave-room', (roomId) => {
    if (!roomId || !rooms[roomId]) return;

    socket.leave(roomId);
    rooms[roomId].delete(socket.id);

    if (rooms[roomId].size === 0) {
      delete rooms[roomId];
    } else {
      // Notify remaining users about updated device count
      io.to(roomId).emit('device-count', rooms[roomId].size);
    }

    console.log(`Socket ${socket.id} left room ${roomId}`);
  });

  // Relay file metadata and chunks from sender to others in the room
  socket.on('file-meta', ({ roomId, fileName, fileSize }) => {
    socket.to(roomId).emit('file-meta', { fileName, fileSize });
  });

  socket.on('file-chunk', ({ roomId, chunk }) => {
    socket.to(roomId).emit('file-chunk', chunk);
  });

  socket.on('file-transfer-complete', (roomId) => {
    socket.to(roomId).emit('file-transfer-complete');
  });

  socket.on('disconnecting', () => {
    // Remove socket from all rooms
    const socketRooms = [...socket.rooms].filter(r => r !== socket.id);
    socketRooms.forEach(roomId => {
      if (rooms[roomId]) {
        rooms[roomId].delete(socket.id);
        if (rooms[roomId].size === 0) {
          delete rooms[roomId];
        } else {
          io.to(roomId).emit('device-count', rooms[roomId].size);
        }
        console.log(`Socket ${socket.id} disconnected and left room ${roomId}`);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
