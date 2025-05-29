// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = {}; // roomId -> { sockets: Set, host: socketId }

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, callback) => {
    roomId = roomId.trim();
    if (!/^\d{4}$/.test(roomId)) {
      callback({ success: false, error: "Room ID must be 4 digits." });
      return;
    }

    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = { sockets: new Set(), host: socket.id };
    }

    rooms[roomId].sockets.add(socket.id);

    const isHost = rooms[roomId].host === socket.id;
    // Notify this socket of success, role and current peers count
    callback({
      success: true,
      isHost,
      peerCount: rooms[roomId].sockets.size
    });

    // Notify others in room about new peer count
    io.to(roomId).emit("peer-count", rooms[roomId].sockets.size);

    // Let others know someone joined (for signaling)
    socket.to(roomId).emit("new-peer", socket.id);

    // For WebRTC signaling - relay signals
    socket.on("signal", (data) => {
      // data: { to: socketId, from: socketId, signal: signalingData }
      io.to(data.to).emit("signal", data);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      if (!rooms[roomId]) return;
      rooms[roomId].sockets.delete(socket.id);

      // If host leaves, assign new host if possible
      if (rooms[roomId].host === socket.id) {
        const socketsArr = Array.from(rooms[roomId].sockets);
        rooms[roomId].host = socketsArr.length ? socketsArr[0] : null;
      }

      // Notify room of updated peer count
      io.to(roomId).emit("peer-count", rooms[roomId].sockets.size);

      // Notify room that a peer left
      socket.to(roomId).emit("peer-left", socket.id);

      // Clean up empty rooms
      if (rooms[roomId].sockets.size === 0) {
        delete rooms[roomId];
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
