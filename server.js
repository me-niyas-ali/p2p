const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = {}; // roomId: { socketId: { ws, name } }


// Serve static files if needed (e.g., your client)
app.use(express.static("public"));

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

wss.on('connection', (ws) => {
  let currentRoom = null;
  let socketId = generateId();
  let peerName = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      switch (data.type) {
        case 'join':
          currentRoom = data.roomId;
          peerName = data.name;

          rooms[currentRoom] = rooms[currentRoom] || {};
          rooms[currentRoom][socketId] = { ws, name: peerName };

          // Notify existing peers
          Object.entries(rooms[currentRoom]).forEach(([id, peer]) => {
            if (id !== socketId) {
              peer.ws.send(JSON.stringify({
                type: 'new-peer',
                id: socketId,
                name: peerName
              }));
              ws.send(JSON.stringify({
                type: 'new-peer',
                id,
                name: peer.name
              }));
            }
          });
          break;

        case 'offer':
        case 'answer':
        case 'ice':
        case 'cancel':
        case 'kick':
          const target = data.target;
          const roomPeers = rooms[currentRoom];
          if (roomPeers && roomPeers[target]) {
            roomPeers[target].ws.send(JSON.stringify({
              ...data,
              from: socketId,
              name: peerName
            }));
          }
          if (data.type === 'kick') {
            // Remove peer from room
            roomPeers[target].ws.close();
            delete roomPeers[target];
          }
          break;
      }
    } catch (err) {
      console.error('Message error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms[currentRoom]) {
      delete rooms[currentRoom][socketId];
      // Notify others
      Object.values(rooms[currentRoom]).forEach(peer => {
        peer.ws.send(JSON.stringify({
          type: 'peer-left',
          id: socketId
        }));
      });
      if (Object.keys(rooms[currentRoom]).length === 0) {
        delete rooms[currentRoom];
      }
    }
  });
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
