const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files from 'public' folder
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
    const clients = io.sockets.adapter.rooms.get(room);
    io.to(room).emit('deviceCount', clients ? clients.size : 1);
  });

  socket.on('leaveRoom', (room) => {
    socket.leave(room);
    console.log(`Socket ${socket.id} left room ${room}`);
    const clients = io.sockets.adapter.rooms.get(room);
    io.to(room).emit('deviceCount', clients ? clients.size : 0);
  });

  socket.on('file-chunk', ({ room, fileId, chunk, chunkIndex, totalChunks, fileName, fileSize }) => {
    socket.to(room).emit('file-chunk', { fileId, chunk, chunkIndex, totalChunks, fileName, fileSize });
  });

  socket.on('file-cancel', ({ room, fileId }) => {
    socket.to(room).emit('file-cancel', { fileId });
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        const clients = io.sockets.adapter.rooms.get(room);
        io.to(room).emit('deviceCount', clients ? clients.size - 1 : 0);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
