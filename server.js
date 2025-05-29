const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

const peers = new Set();

io.on('connection', (socket) => {
  socket.on('register-peer', (peerId) => {
    socket.peerId = peerId;
    peers.add(peerId);
    io.emit('peer-list', Array.from(peers));
  });

  socket.on('get-peers', () => {
    io.emit('peer-list', Array.from(peers));
  });

  socket.on('disconnect', () => {
    if (socket.peerId) {
      peers.delete(socket.peerId);
      io.emit('peer-list', Array.from(peers));
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Server running...');
});
