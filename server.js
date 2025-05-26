// signaling-server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const rooms = {};

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    switch (data.type) {
      case 'join':
        if (!rooms[data.room]) {
          rooms[data.room] = [];
        }
        rooms[data.room].push(ws);
        ws.room = data.room;
        ws.send(JSON.stringify({ type: 'joined', initiator: rooms[data.room].length === 1 }));
        break;
      case 'offer':
      case 'answer':
      case 'candidate':
        rooms[ws.room].forEach((client) => {
          if (client !== ws) {
            client.send(JSON.stringify(data));
          }
        });
        break;
    }
  });

  ws.on('close', () => {
    if (ws.room) {
      rooms[ws.room] = rooms[ws.room].filter((client) => client !== ws);
      if (rooms[ws.room].length === 0) {
        delete rooms[ws.room];
      }
    }
  });
});
