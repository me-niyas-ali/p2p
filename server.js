const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

let clients = {};

io.on("connection", socket => {
  socket.on("join", name => {
    clients[socket.id] = name;
    io.emit("peer-list", Object.values(clients));
  });

  socket.on("signal", ({ to, from, data }) => {
    const targetSocketId = Object.keys(clients).find(id => clients[id] === to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("signal", { from, data });
    }
  });

  socket.on("disconnect", () => {
    delete clients[socket.id];
    io.emit("peer-list", Object.values(clients));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on port " + PORT));
