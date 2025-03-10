const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const Trade = require('./models/Trade');
const path = require('path');

const PORT = process.env.PORT || 3002;
const connectedPlayers = new Map();
const activeTrades = new Map();
const players = new Map();

// Servir les fichiers statiques depuis le dossier client
app.use(express.static(path.join(__dirname, '../client')));

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

io.on('connection', (socket) => {
    console.log('Un joueur s\'est connecté');

    socket.on('playerJoin', (playerData) => {
        playerData.id = socket.id;
        connectedPlayers.set(socket.id, playerData);
        io.emit('playerUpdate', Object.fromEntries(connectedPlayers));
    });

    socket.on('updatePosition', (playerData) => {
        connectedPlayers.set(socket.id, playerData);
        io.emit('playerUpdate', Object.fromEntries(connectedPlayers));
    });

    socket.on('disconnect', () => {
        connectedPlayers.delete(socket.id);
        io.emit('playerUpdate', Object.fromEntries(connectedPlayers));
    });

    socket.on('trade-request', (receiverId) => {
        const sender = connectedPlayers.get(socket.id);
        const receiver = connectedPlayers.get(receiverId);
        
        if (!sender || !receiver) return;
        
        const trade = new Trade(socket.id, receiverId);
        activeTrades.set(trade.id, trade);
        
        io.to(receiverId).emit('trade-request', {
            tradeId: trade.id,
            sender: sender.username
        });
    });

    socket.on('trade-response', (data) => {
        const trade = activeTrades.get(data.tradeId);
        if (!trade) return;
        
        if (data.accepted) {
            trade.accept();
            io.to(trade.senderId).emit('trade-accepted', trade.id);
        } else {
            trade.reject();
            io.to(trade.senderId).emit('trade-rejected', trade.id);
            activeTrades.delete(trade.id);
        }
    });

    socket.on('add-trade-item', (data) => {
        const trade = activeTrades.get(data.tradeId);
        if (!trade || trade.status !== 'accepted') return;
        
        trade.addItem(socket.id, data.item);
        io.to(trade.senderId).emit('trade-updated', trade);
        io.to(trade.receiverId).emit('trade-updated', trade);
    });

    socket.on('interaction', (data) => {
        const targetSocket = io.sockets.sockets.get(data.targetId);
        if (targetSocket) {
            io.to(data.targetId).emit('interactionReceived', {
                fromId: socket.id
            });
        }
    });
});

http.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
}); 