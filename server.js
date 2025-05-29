const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://me-niyas-ali.github.io/p2p", // Frontend URL
    methods: ["GET", "POST"]
  }
});

const rooms = {}; // Track socket-to-room relationships

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    rooms[socket.id] = roomId;

    const devices = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    const peers = [...io.sockets.adapter.rooms.get(roomId) || []].filter(id => id !== socket.id);
    const isHost = peers.length === 0;

    socket.emit('room-joined', { roomId, devices, isHost });
    io.to(roomId).emit('room-updated', { devices });

    peers.forEach(peerId => {
      io.to(peerId).emit('new-peer', socket.id);
    });
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    delete rooms[socket.id];

    const devices = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    io.to(roomId).emit('room-updated', { devices });

    io.to(roomId).emit('peer-left', socket.id);
  });

  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', { from: socket.id, signal });
  });

  socket.on('send-file-meta', ({ roomId, metadata }) => {
    socket.to(roomId).emit('file-meta', metadata);
  });

  socket.on('send-file-chunk', ({ roomId, transferId, chunk }) => {
    socket.to(roomId).emit('file-chunk', { transferId, chunk });
  });

  socket.on("send-cancel-transfer", ({ roomId, transferId }) => {
    socket.to(roomId).emit("send-cancel-transfer", { transferId });
  });

  socket.on('disconnect', () => {
    const roomId = rooms[socket.id];
    if (roomId) {
      delete rooms[socket.id];

      const devices = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      io.to(roomId).emit('room-updated', { devices });
      io.to(roomId).emit('peer-left', socket.id);

      if (devices === 0) {
        console.log(`Room ${roomId} is now empty.`);
      }
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
