const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = process.env.PORT || 3000;

app.use(express.static('public'));

let clients = {};

io.on('connection', (socket) => {
    socket.on('create-room', (roomID) => {
        socket.join(roomID);
        clients[socket.id] = { score: 0, room: roomID };
        io.to(roomID).emit('update-leaderboard', clients);
    });

    socket.on('join-room', (roomID) => {
        socket.join(roomID);
        clients[socket.id] = { score: 0, room: roomID };
        io.to(roomID).emit('update-leaderboard', clients);
    });

    socket.on('update-score', (score) => {
        if (clients[socket.id]) {
            clients[socket.id].score = score;
            io.to(clients[socket.id].room).emit('update-leaderboard', clients);
        }
    });

    socket.on('reset-game', () => {
        if (clients[socket.id]) {
            clients[socket.id].score = 0;
            io.to(clients[socket.id].room).emit('update-leaderboard', clients);
        }
    });

    socket.on('disconnect', () => {
        if (clients[socket.id]) {
            const room = clients[socket.id].room;
            delete clients[socket.id];
            io.to(room).emit('update-leaderboard', clients);
        }
    });
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
