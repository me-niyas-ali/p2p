// server.js

const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer();
const wss = new WebSocket.Server({ server });

/**
 * Rooms structure:
 * {
 *   roomId: {
 *     clients: Map(clientId -> ws),
 *   }
 * }
 */
const rooms = new Map();

function generateClientId() {
  return Math.random().toString(36).substr(2, 9);
}

wss.on('connection', (ws) => {
  let currentRoom = null;
  let clientId = generateClientId();

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);

      if (msg.type === 'join') {
        const roomId = msg.data.roomId;
        if (!rooms.has(roomId)) {
          rooms.set(roomId, {
            clients: new Map(),
          });
        }
        currentRoom = roomId;
        const room = rooms.get(roomId);
        room.clients.set(clientId, ws);

        // Send back joined info + clients list
        const otherClients = Array.from(room.clients.keys()).filter(id => id !== clientId);

        ws.send(JSON.stringify({
          type: 'joined',
          data: {
            clientId,
            clients: otherClients,
          },
        }));

        // Notify others of new peer
        otherClients.forEach(id => {
          const client = room.clients.get(id);
          if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'new-peer',
              data: { clientId },
            }));
          }
        });

      } else if (msg.type === 'signal') {
        // Relay signaling messages to target peer
        const { target, from, sdp, ice } = msg.data;
        if (!currentRoom) return;
        const room = rooms.get(currentRoom);
        if (!room) return;
        const targetClient = room.clients.get(target);
        if (targetClient && targetClient.readyState === WebSocket.OPEN) {
          targetClient.send(JSON.stringify({
            type: 'signal',
            data: { from, sdp, ice },
          }));
        }
      }
    } catch (e) {
      console.error('Error processing message:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.clients.delete(clientId);
        // Notify remaining peers
        room.clients.forEach((clientWs, id) => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({
              type: 'peer-left',
              data: { clientId },
            }));
          }
        });
        if (room.clients.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
