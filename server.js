// server.js
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const fs = require("fs");
const multer = require("multer");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const upload = multer({ dest: "uploads/" });

const rooms = {}; // roomId => [socketId, ...]

// Serve frontend
app.use(express.static("public"));

// Serve uploaded files
app.use("/files", express.static(path.join(__dirname, "uploads")));

// File upload route
app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ filePath: `/files/${req.file.filename}`, originalName: req.file.originalname });
});

// Socket.io logic
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join", (roomId) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
    io.to(roomId).emit("update-devices", rooms[roomId].length);
  });

  socket.on("send-file", ({ roomId, fileUrl, fileName, fileSize }) => {
    socket.to(roomId).emit("receive-file", { fileUrl, fileName, fileSize });
  });

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
        if (rooms[roomId].length === 0) delete rooms[roomId];
        else io.to(roomId).emit("update-devices", rooms[roomId].length);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
