/** Dependencies & Config */
const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMsg, generateLocationMsg } = require ('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));


/** Websocket */
io.on('connection', socket => {
    console.log('New WebSocket connection');

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options });
        if (error) return callback(error);

        socket.join(user.room);

        socket.emit('message', generateMsg('Admin', 'Welcome to the chat app!'));
        socket.broadcast.to(user.room).emit('message', generateMsg('Admin', `${user.username} has joined!`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });

        callback();
    });

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter();
        if (filter.isProfane(message)) return callback('Bad words are not allowed!');

        const user = getUser(socket.id);
        if (!user) return callback({ error: 'Unabled to find user!' });

        io.to(user.room).emit('message', generateMsg(user.username, message));
        callback();
    });

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id);
        if (!user) return callback({ error: 'Unabled to find user!' });

        io.to(user.room).emit('locationMessage', generateLocationMsg(user.username, `https://google.com/maps?q=${coords.lat},${coords.long}`));
        callback();
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if (user) {
            io.to(user.room).emit('message', generateMsg('Admin', `${user.username} has left!`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    })
});


/** Starting the server */
server.listen(port, () => {
    console.log(`Server is listening on port ${port}...`);
});