// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {}; // Stores connected sockets per room

// Serve static files (your HTML should be in a folder named "public")
app.use(express.static('public'));

// Handle socket connection
io.on('connection', (socket) => {
  let currentRoom = null;

  // Handle room joining
  socket.on('join-room', (room) => {
    currentRoom = room;
    socket.join(room);

    if (!rooms[room]) rooms[room] = new Set();
    rooms[room].add(socket.id);

    // Send updated device count to room
    io.to(room).emit('update-count', rooms[room].size);

    // Handle disconnect
    socket.on('disconnect', () => {
      if (rooms[room]) {
        rooms[room].delete(socket.id);
        if (rooms[room].size === 0) delete rooms[room];
        else io.to(room).emit('update-count', rooms[room].size);
      }
    });
  });

  // Relay file sending start
  socket.on('start-file', (data) => {
    socket.to(data.room).emit('start-file', {
      name: data.name,
      size: data.size
    });
  });

  // Relay file chunks
  socket.on('file-chunk', (data) => {
    socket.to(data.room).emit('file-chunk', {
      name: data.name,
      data: data.data,
      done: data.done
    });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
