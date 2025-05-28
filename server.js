// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // allow all origins
    methods: ['GET', 'POST']
  }
});

const users = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('register', (username) => {
    users[socket.id] = username;
    socket.broadcast.emit('user-joined', { id: socket.id, username });
  });

  socket.on('signal', ({ target, signal }) => {
    io.to(target).emit('signal', { from: socket.id, signal, username: users[socket.id] });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    delete users[socket.id];
    io.emit('user-left', socket.id);
  });
});

app.get('/', (req, res) => {
  res.send('Signaling server is running.');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
