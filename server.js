// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {};

io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);

  socket.on("create-room", (roomId) => {
    console.log(`📦 Host created room: ${roomId}`);
    rooms[roomId] = [socket.id];
    socket.join(roomId);
  });

  socket.on("join-room", (roomId) => {
    const room = rooms[roomId];
    if (room && room.length === 1) {
      console.log(`👥 Client joined room: ${roomId}`);
      rooms[roomId].push(socket.id);
      socket.join(roomId);

      // Notify both sides
      socket.emit("room-joined");
      socket.to(roomId).emit("room-joined");
    } else {
      console.log(`❌ Join failed for room: ${roomId}`);
    }
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      }
    }
    console.log(`🚪 Client left room: ${roomId}`);
  });

  socket.on("offer", (roomId, offer) => {
    socket.to(roomId).emit("offer", offer);
  });

  socket.on("answer", (roomId, answer) => {
    socket.to(roomId).emit("answer", answer);
  });

  socket.on("ice-candidate", (roomId, candidate) => {
    socket.to(roomId).emit("ice-candidate", candidate);
  });

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      }
    }
  });
});

app.use(express.static(path.join(__dirname, "public")));

server.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
