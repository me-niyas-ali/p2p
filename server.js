const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files if needed (e.g., your client)
app.use(express.static("public"));

// Room data structure to track sockets in rooms
const rooms = {};

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Track which room the socket is in
  socket.on("join-room", (room) => {
    // Leave previous rooms just in case
    Object.keys(socket.rooms).forEach((r) => {
      if (r !== socket.id) socket.leave(r);
    });

    socket.join(room);
    console.log(`${socket.id} joined room ${room}`);

    // Track rooms
    if (!rooms[room]) rooms[room] = new Set();
    rooms[room].add(socket.id);

    // Broadcast updated connected count to room
    io.to(room).emit("update-count", rooms[room].size);
  });

  // Relay "start-file" event to all except sender
  socket.on("start-file", (data) => {
    if (!data.room) return;
    socket.to(data.room).emit("start-file", { name: data.name, size: data.size });
  });

  // Relay file chunks to others in the room
  socket.on("file-chunk", (data) => {
    if (!data.room) return;
    socket.to(data.room).emit("file-chunk", { name: data.name, data: data.data, done: data.done });
  });

  // Relay cancel event to others in the room
  socket.on("cancel-file", (data) => {
    if (!data.room) return;
    socket.to(data.room).emit("cancel-file", { name: data.name });
  });

  // Handle disconnect: remove socket from rooms and update counts
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
    for (const room in rooms) {
      if (rooms[room].has(socket.id)) {
        rooms[room].delete(socket.id);
        io.to(room).emit("update-count", rooms[room].size);
        if (rooms[room].size === 0) delete rooms[room];
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
