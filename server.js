const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {};

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', socket => {
  socket.on('join-room', roomId => {
    socket.join(roomId);
    rooms[socket.id] = roomId;

    const devices = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    socket.emit('room-joined', { roomId, devices });
    io.to(roomId).emit('room-updated', { devices });

    // Notify others in the room about the new user joining (multiline message)
    socket.to(roomId).emit('user-joined-toast', {
      message: `A user joined the room\n(${devices} users now)`
    });
  });

  socket.on('leave-room', roomId => {
    socket.leave(roomId);
    delete rooms[socket.id];
    const devices = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    io.to(roomId).emit('room-updated', { devices });

    // Notify remaining users someone left (multiline message)
    io.to(roomId).emit('user-left-toast', {
      message: `A user left the room\n(${devices} users now)`
    });
  });

  socket.on('send-file-meta', ({ roomId, metadata }) => {
    socket.to(roomId).emit('file-meta', metadata);
  });

  socket.on('send-file-chunk', ({ roomId, transferId, chunk }) => {
    socket.to(roomId).emit('file-chunk', { transferId, chunk });
  });

  socket.on('send-cancel-transfer', ({ roomId, transferId }) => {
    socket.to(roomId).emit('send-cancel-transfer', { transferId });
  });

  socket.on('disconnect', () => {
    const roomId = rooms[socket.id];
    if (roomId) {
      delete rooms[socket.id];
      const devices = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      io.to(roomId).emit('room-updated', { devices });

      // Notify remaining users someone disconnected (multiline message)
      io.to(roomId).emit('user-left-toast', {
        message: `A user left the room\n(${devices} users now)`
      });
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
