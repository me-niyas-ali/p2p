const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // adjust to your front-end domain if needed
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, callback) => {
    if (!/^\d{4}$/.test(roomId)) {
      callback({ success: false, error: "Invalid room ID" });
      return;
    }

    socket.join(roomId);

    // Track room members
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    const roomSet = rooms.get(roomId);
    roomSet.add(socket.id);

    // Inform about peer count
    const peerCount = roomSet.size;

    // Host is the first to join
    const isHost = peerCount === 1;

    // Notify existing peers about the new peer
    socket.to(roomId).emit("new-peer", socket.id);

    // Send current peer count to room
    io.in(roomId).emit("peer-count", peerCount);

    callback({ success: true, isHost, peerCount });

    // On disconnect
    socket.on("disconnect", () => {
      if (rooms.has(roomId)) {
        const set = rooms.get(roomId);
        set.delete(socket.id);
        io.in(roomId).emit("peer-left", socket.id);
        io.in(roomId).emit("peer-count", set.size);
        if (set.size === 0) {
          rooms.delete(roomId);
        }
      }
    });

    // Relay signaling messages
    socket.on("signal", (data) => {
      const { to } = data;
      io.to(to).emit("signal", { from: socket.id, signal: data.signal });
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
