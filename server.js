const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const rooms = {};

app.use(express.static(__dirname + '/'));

io.on('connection', socket => {
  socket.on('join', roomId => {
    socket.join(roomId);
    socket.roomId = roomId;

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);

    const isHost = rooms[roomId][0] === socket.id;
    socket.emit('joined', { isHost });
    io.to(roomId).emit('deviceCount', rooms[roomId].length);
  });

  socket.on('leave', () => {
    leaveRoom(socket);
  });

  socket.on('disconnect', () => {
    leaveRoom(socket);
  });

  socket.on('send-meta', meta => {
    socket.to(socket.roomId).emit('file-meta', meta);
  });

  socket.on('file-chunk', chunk => {
    socket.to(socket.roomId).emit('file-chunk', chunk);
  });

  socket.on('file-complete', () => {
    socket.to(socket.roomId).emit('file-complete');
  });

  socket.on('cancel-transfer', () => {
    socket.to(socket.roomId).emit('cancel-transfer');
  });

  function leaveRoom(socket) {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
    if (rooms[roomId].length === 0) delete rooms[roomId];
    io.to(roomId).emit('deviceCount', rooms[roomId]?.length || 0);
    socket.leave(roomId);
    socket.emit('left');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
