const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // On Render, restrict to your domain in production
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const rooms = {};

io.on("connection", (socket) => {
  let joinedRoom = null;

  socket.on("join-room", (room) => {
    if (joinedRoom) {
      socket.leave(joinedRoom);
      if (rooms[joinedRoom]) {
        rooms[joinedRoom].delete(socket.id);
        io.to(joinedRoom).emit("update-count", rooms[joinedRoom].size);
      }
    }

    joinedRoom = room;
    socket.join(room);
    if (!rooms[room]) rooms[room] = new Set();
    rooms[room].add(socket.id);
    io.to(room).emit("update-count", rooms[room].size);
  });

  socket.on("start-file", (data) => {
    socket.to(joinedRoom).emit("start-file", data);
  });

  socket.on("file-chunk", (data) => {
    socket.to(joinedRoom).emit("file-chunk", data);
  });

  socket.on("cancel-file", (data) => {
    socket.to(joinedRoom).emit("cancel-file", data);
  });

  socket.on("disconnect", () => {
    if (joinedRoom && rooms[joinedRoom]) {
      rooms[joinedRoom].delete(socket.id);
      if (rooms[joinedRoom].size === 0) {
        delete rooms[joinedRoom];
      } else {
        io.to(joinedRoom).emit("update-count", rooms[joinedRoom].size);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
