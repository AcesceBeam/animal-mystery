const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const clients = {};
const rooms = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('createRoom', () => {
        const roomId = generateRoomId();
        rooms[roomId] = [];
        socket.join(roomId);
        clients[socket.id] = { score: 0, roomId };
        rooms[roomId].push(socket.id);
        io.to(socket.id).emit('roomCreated', roomId);
    });

    socket.on('joinRoom', (roomId) => {
        if (rooms[roomId]) {
            socket.join(roomId);
            clients[socket.id] = { score: 0, roomId };
            rooms[roomId].push(socket.id);
            io.to(socket.id).emit('roomJoined', roomId);
        } else {
            io.to(socket.id).emit('error', 'Room does not exist');
        }
    });

    socket.on('correctAnswer', (answer) => {
        const client = clients[socket.id];
        if (client) {
            client.score += 1;
            io.in(client.roomId).emit('correctAnswer', answer);
            updateLeaderboard(client.roomId);
        }
    });

    socket.on('resetGame', () => {
        const client = clients[socket.id];
        if (client) {
            rooms[client.roomId].forEach(clientId => {
                clients[clientId].score = 0;
            });
            io.in(client.roomId).emit('resetGame');
            updateLeaderboard(client.roomId);
        }
    });

    socket.on('disconnect', () => {
        const client = clients[socket.id];
        if (client) {
            const roomId = client.roomId;
            rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
            if (rooms[roomId].length === 0) {
                delete rooms[roomId];
            }
            delete clients[socket.id];
            updateLeaderboard(roomId);
        }
        console.log('Client disconnected');
    });

    function generateRoomId() {
        return Math.random().toString(36).substr(2, 6);
    }

    function updateLeaderboard(roomId) {
        const leaderboard = {};
        rooms[roomId].forEach(clientId => {
            leaderboard[clientId] = clients[clientId];
        });
        io.in(roomId).emit('updateLeaderboard', leaderboard);
    }
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Listening on port ${port}`));
