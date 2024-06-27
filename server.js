const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

let rooms = {};

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('createRoom', () => {
        let roomId = Math.random().toString(36).substring(2, 7);
        rooms[roomId] = { players: {}, currentClue: '' };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
        console.log(`Room ${roomId} created`);
    });

    socket.on('joinRoom', ({ roomId, playerName }) => {
        if (rooms[roomId]) {
            socket.join(roomId);
            rooms[roomId].players[playerName] = { score: 0 };
            socket.emit('roomJoined', rooms[roomId].currentClue);
            io.to(roomId).emit('message', `Player ${playerName} joined the room`);
            io.to(roomId).emit('updateLeaderboard', rooms[roomId].players);
            console.log(`Player ${playerName} joined room ${roomId}`);
        } else {
            socket.emit('error', 'Room does not exist');
        }
    });

    socket.on('correctGuess', ({ playerName, score, roomId }) => {
        if (rooms[roomId]) {
            rooms[roomId].players[playerName].score = score;
            io.to(roomId).emit('updateLeaderboard', rooms[roomId].players);
        }
    });

    socket.on('newClue', ({ clue, roomId }) => {
        if (rooms[roomId]) {
            rooms[roomId].currentClue = clue;
            io.to(roomId).emit('newClue', clue);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        for (let roomId in rooms) {
            const room = rooms[roomId];
            for (let player in room.players) {
                if (socket.id === player) {
                    delete room.players[player];
                    io.to(roomId).emit('updateLeaderboard', room.players);
                    break;
                }
            }
            if (Object.keys(room.players).length === 0) {
                delete rooms[roomId];
                console.log(`Room ${roomId} deleted`);
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
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
