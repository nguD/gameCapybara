const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = 3000;

const connectedPlayers = new Map();
const capybaras = new Map();

io.on('connection', (socket) => {
    console.log('Un joueur s\'est connecté');

    socket.on('join', (playerData) => {
        // Gérer la connexion d'un nouveau joueur
    });

    socket.on('chat', (message) => {
        // Diffuser le message à tous les joueurs
        io.emit('chat', message);
    });

    socket.on('feed_capybara', (data) => {
        // Gérer le nourrissage d'un capybara
    });

    socket.on('walk_capybara', (data) => {
        // Gérer la promenade d'un capybara
    });
});

http.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
}); 