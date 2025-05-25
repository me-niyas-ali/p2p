const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
  }
});

const PORT = process.env.PORT || 10000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('join-room', roomId => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    socket.to(roomId).emit('user-joined');
  });

  socket.on('signal', ({ roomId, target, data }) => {
    if (target) {
      io.to(target).emit('signal', { from: socket.id, data });
    } else {
      socket.to(roomId).emit('signal', { from: socket.id, data });
    }
  });

  socket.on('disconnecting', () => {
    const rooms = [...socket.rooms].filter(r => r !== socket.id);
    rooms.forEach(roomId => {
      socket.to(roomId).emit('user-left');
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
