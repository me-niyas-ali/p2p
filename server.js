
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const rooms = {};

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);
    io.to(roomId).emit('room-joined', { roomId, devices: rooms[roomId].length });
    io.to(roomId).emit('update-devices', rooms[roomId].length);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
    io.to(roomId).emit('room-exited');
    if (rooms[roomId].length === 0) delete rooms[roomId];
  });

  socket.on('signal', ({ roomId, desc, candidate }) => {
    socket.to(roomId).emit('signal', { desc, candidate });
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      io.to(roomId).emit('update-devices', rooms[roomId].length);
      if (rooms[roomId].length === 0) delete rooms[roomId];
    }
  });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));