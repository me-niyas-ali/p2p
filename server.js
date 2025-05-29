const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const rooms = {}; // Map roomId -> { host: socketId, peers: [socketId, ...] }

io.on('connection', socket => {
    console.log('Client connected:', socket.id);

    socket.on('join-room', ({ roomId }) => {
        console.log(`Socket ${socket.id} joining room ${roomId}`);
        // If room doesn't exist, create and mark this socket as host
        if (!rooms[roomId]) {
            rooms[roomId] = { host: socket.id, peers: [socket.id] };
            socket.join(roomId);
            socket.emit('room-created');
            console.log(`Room ${roomId} created, host: ${socket.id}`);
        } else {
            // Join existing room
            const room = rooms[roomId];
            room.peers.push(socket.id);
            socket.join(roomId);
            // Tell the new user about existing peers
            const otherPeers = room.peers.filter(id => id !== socket.id);
            socket.emit('all-users', otherPeers);
            // Notify existing peers that someone joined
            socket.to(roomId).emit('user-joined', socket.id);
            console.log(`Socket ${socket.id} joined room ${roomId}`);
        }
    });

    socket.on('leave-room', ({ roomId }) => {
        leaveRoom(socket, roomId);
    });

    // Relay signaling data: offer/answer/ICE to target peer
    socket.on('signal', data => {
        const { to, type, sdp, candidate } = data;
        io.to(to).emit('signal', { from: socket.id, type, sdp, candidate });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Remove from any room it was in
        for (const roomId in rooms) {
            if (rooms[roomId].peers.includes(socket.id)) {
                leaveRoom(socket, roomId);
            }
        }
    });

    function leaveRoom(socket, roomId) {
        const room = rooms[roomId];
        if (!room) return;
        // Remove the leaving peer
        room.peers = room.peers.filter(id => id !== socket.id);
        // Notify others
        socket.to(roomId).emit('user-left', socket.id);
        socket.leave(roomId);
        console.log(`Socket ${socket.id} left room ${roomId}`);
        // If host left, assign new host
        if (room.host === socket.id) {
            if (room.peers.length > 0) {
                room.host = room.peers[0];
                console.log(`New host for room ${roomId} is ${room.host}`);
            }
        }
        // If room empty, delete it
        if (room.peers.length === 0) {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted`);
        }
    }
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
