// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files (if needed)
app.use(express.static('public'));

const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    const room = rooms[roomId] || { clients: [] };
    room.clients.push(socket.id);
    rooms[roomId] = room;

    console.log(`User ${socket.id} joined room ${roomId}`);

    // Notify all clients in room about connected count
    io.to(roomId).emit('connected-count', room.clients.length);

    // Tell this client if it is host (first joined)
    socket.emit('host-status', room.clients[0] === socket.id);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    if (rooms[roomId]) {
      rooms[roomId].clients = rooms[roomId].clients.filter(id => id !== socket.id);
      if (rooms[roomId].clients.length === 0) delete rooms[roomId];
      else {
        io.to(roomId).emit('connected-count', rooms[roomId].clients.length);
        // Update new host if needed
        io.to(roomId).emit('host-status', rooms[roomId].clients[0]);
      }
    }
  });

  socket.on('send-file-meta', ({ roomId, metadata }) => {
    // Broadcast to all except sender
    socket.to(roomId).emit('file-meta', metadata);
  });

  socket.on('send-file-chunk', ({ roomId, chunk }) => {
    // Broadcast chunk to all except sender
    socket.to(roomId).emit('file-chunk', chunk);
  });

  socket.on('send-file-complete', (roomId) => {
    socket.to(roomId).emit('file-complete');
  });

  socket.on('send-cancel-transfer', (roomId) => {
    socket.to(roomId).emit('cancel-transfer');
  });

  socket.on('disconnecting', () => {
    const roomsJoined = Array.from(socket.rooms).filter(r => r !== socket.id);
    roomsJoined.forEach(roomId => {
      if (rooms[roomId]) {
        rooms[roomId].clients = rooms[roomId].clients.filter(id => id !== socket.id);
        if (rooms[roomId].clients.length === 0) delete rooms[roomId];
        else {
          io.to(roomId).emit('connected-count', rooms[roomId].clients.length);
          io.to(roomId).emit('host-status', rooms[roomId].clients[0]);
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
