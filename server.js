const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const port = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

let rooms = {};
let clients = {};

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('create-room', () => {
        let roomId = Math.random().toString(36).substring(2, 7);
        rooms[roomId] = { players: {}, currentClue: '' };
        socket.join(roomId);
        clients[socket.id] = { score: 0, room: roomId };
        socket.emit('roomCreated', roomId);
        io.to(roomId).emit('update-leaderboard', rooms[roomId].players);
        console.log(`Room ${roomId} created`);
    });

    socket.on('join-room', (roomId) => {
        if (rooms[roomId]) {
            socket.join(roomId);
            rooms[roomId].players[socket.id] = { score: 0 };
            clients[socket.id] = { score: 0, room: roomId };
            socket.emit('roomJoined', rooms[roomId].currentClue);
            io.to(roomId).emit('update-leaderboard', rooms[roomId].players);
            console.log(`Player joined room ${roomId}`);
        } else {
            socket.emit('error', 'Room does not exist');
        }
    });

    socket.on('correctGuess', (score) => {
        const roomId = clients[socket.id]?.room;
        if (roomId && rooms[roomId]) {
            rooms[roomId].players[socket.id].score = score;
            clients[socket.id].score = score;
            io.to(roomId).emit('update-leaderboard', rooms[roomId].players);
        }
    });

    socket.on('newClue', (clue) => {
        const roomId = clients[socket.id]?.room;
        if (roomId && rooms[roomId]) {
            rooms[roomId].currentClue = clue;
            io.to(roomId).emit('newClue', clue);
        }
    });

    socket.on('reset-game', () => {
        const roomId = clients[socket.id]?.room;
        if (roomId && rooms[roomId]) {
            for (let player in rooms[roomId].players) {
                rooms[roomId].players[player].score = 0;
            }
            io.to(roomId).emit('update-leaderboard', rooms[roomId].players);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        const roomId = clients[socket.id]?.room;
        if (roomId && rooms[roomId]) {
            delete rooms[roomId].players[socket.id];
            delete clients[socket.id];
            io.to(roomId).emit('update-leaderboard', rooms[roomId].players);
            if (Object.keys(rooms[roomId].players).length === 0) {
                delete rooms[roomId];
                console.log(`Room ${roomId} deleted`);
            }
        }
    });
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
