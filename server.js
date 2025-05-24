const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const rooms = {};

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('join-room', (room) => {
    socket.join(room);
    currentRoom = room;

    rooms[room] = rooms[room] || [];
    rooms[room].push(socket.id);

    io.to(room).emit('update-count', rooms[room].length);
  });

  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom] = rooms[currentRoom].filter(id => id !== socket.id);
      io.to(currentRoom).emit('update-count', rooms[currentRoom].length);
    }
  });

  socket.on('start-file', (data) => {
    socket.to(currentRoom).emit('start-file', data);
  });

  socket.on('file-chunk', (data) => {
    socket.to(currentRoom).emit('file-chunk', data);
  });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));