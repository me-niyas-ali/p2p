const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*"
  }
});

let users = {};

io.on("connection", socket => {
  const userName = generateName();
  users[socket.id] = userName;

  socket.emit("init", { id: socket.id, name: userName });
  io.emit("users", users);

  socket.on("signal", data => {
    io.to(data.target).emit("signal", {
      from: socket.id,
      signal: data.signal
    });
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    io.emit("users", users);
  });
});

function generateName() {
  const adj = ["Quick", "Silent", "Clever", "Happy", "Bright"];
  const noun = ["Fox", "Lion", "Tiger", "Owl", "Eagle"];
  return `${adj[Math.floor(Math.random() * adj.length)]} ${noun[Math.floor(Math.random() * noun.length)]}`;
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on ${PORT}`));
