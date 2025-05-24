const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

app.use(express.static('public')); // Serve client files from public folder

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  // Join room event
  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`${socket.id} joined room ${room}`);

    // Broadcast device count in room
    const clients = io.sockets.adapter.rooms.get(room);
    const count = clients ? clients.size : 0;
    io.to(room).emit('deviceCount', count);
  });

  // Relay file chunk to room except sender
  socket.on('file-chunk', (data) => {
    socket.to(data.room).emit('file-chunk', data);
  });

  // Relay cancel event
  socket.on('file-cancel', ({ room, fileId }) => {
    socket.to(room).emit('file-cancel', { fileId });
  });

  socket.on('disconnecting', () => {
    const rooms = socket.rooms;
    rooms.forEach(room => {
      if (room !== socket.id) {
        setTimeout(() => {
          const clients = io.sockets.adapter.rooms.get(room);
          const count = clients ? clients.size : 0;
          io.to(room).emit('deviceCount', count);
        }, 100);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
