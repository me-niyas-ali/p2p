const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST']
  }
});

// In-memory storage for socket-room mapping
const rooms = {};

// Enable CORS for Express
app.use(cors());

// Serve static files from root directory
app.use(express.static(path.join(__dirname)));

// Fallback to index.html for any unrecognized route (for SPAs)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', socket => {
  socket.on('join-room', roomId => {
    socket.join(roomId);
    rooms[socket.id] = roomId;

    const devices = io.sockets.adapter.rooms.get(roomId)?.size || 0;

    socket.emit('room-joined', { roomId, devices });
    io.to(roomId).emit('room-updated', { devices });
    socket.to(roomId).emit('user-joined-toast', { devices });
  });

  socket.on('leave-room', roomId => {
    socket.leave(roomId);
    delete rooms[socket.id];

    const devices = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    io.to(roomId).emit('room-updated', { devices });
    io.to(roomId).emit('user-left-toast', { devices });
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
      io.to(roomId).emit('user-left-toast', { devices });
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
