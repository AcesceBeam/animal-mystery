const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname + '/public'));

const rooms = {};

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('createRoom', () => {
        const roomId = uuidv4();
        rooms[roomId] = {
            clients: [socket.id],
            currentClueIndex: 0
        };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', (roomId) => {
        if (rooms[roomId]) {
            rooms[roomId].clients.push(socket.id);
            socket.join(roomId);
            socket.emit('roomJoined', roomId);
        } else {
            socket.emit('error', 'Room not found');
        }
    });

    socket.on('correctAnswer', (answer) => {
        const roomId = Object.keys(socket.rooms).filter(item => item !== socket.id)[0];
        if (rooms[roomId]) {
            io.to(roomId).emit('correctAnswer', answer);
        }
    });

    socket.on('resetGame', () => {
        const roomId = Object.keys(socket.rooms).filter(item => item !== socket.id)[0];
        if (rooms[roomId]) {
            rooms[roomId].currentClueIndex = 0;
            io.to(roomId).emit('resetGame');
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        const roomId = Object.keys(socket.rooms).filter(item => item !== socket.id)[0];
        if (rooms[roomId]) {
            rooms[roomId].clients = rooms[roomId].clients.filter(id => id !== socket.id);
            if (rooms[roomId].clients.length === 0) {
                delete rooms[roomId];
            }
        }
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
