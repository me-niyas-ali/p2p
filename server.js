const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Replace with the domain where your frontend is hosted
const FRONTEND_ORIGIN = "https://niyasali.w3spaces.com/test.html";

app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ["GET", "POST"]
}));

const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"]
  }
});

const rooms = {};

app.use(express.static(path.join(__dirname, 'public')));

// Socket handlers (unchanged)
io.on('connection', socket => {
  socket.on('join-room', roomId => {
    socket.join(roomId);
    rooms[socket.id] = roomId;

    const devices = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    socket.emit('room-joined', { roomId, devices });
    io.to(roomId).emit('room-updated', { devices });
  });

  socket.on('leave-room', roomId => {
    socket.leave(roomId);
    delete rooms[socket.id];
    const devices = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    io.to(roomId).emit('room-updated', { devices });
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
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
