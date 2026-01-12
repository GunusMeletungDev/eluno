// PeerJS Matchmaking Broker Server
// This server maintains a waiting queue and pairs players automatically

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Allow all origins for development
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Matchmaking queue
let waitingQueue = [];
const PLAYER_TIMEOUT = 120000; // 30 seconds timeout

// Helper function to remove player from queue
function removeFromQueue(socketId) {
    const index = waitingQueue.findIndex(player => player.socketId === socketId);
    if (index !== -1) {
        waitingQueue.splice(index, 1);
        console.log(`Player ${socketId} removed from queue. Queue size: ${waitingQueue.length}`);
    }
}

// Helper function to match players
function matchPlayers() {
    if (waitingQueue.length >= 2) {
        const player1 = waitingQueue.shift(); // First in queue
        const player2 = waitingQueue.shift(); // Second in queue

        console.log(`Matching players: ${player1.socketId} (Host) with ${player2.socketId} (Guest)`);

        // Assign roles - Player 1 becomes Host, Player 2 becomes Guest
        io.to(player1.socketId).emit('match_found', {
            role: 'host',
            opponentId: player2.peerId,
            message: 'Match found! You are the host.'
        });

        io.to(player2.socketId).emit('match_found', {
            role: 'guest',
            opponentId: player1.peerId,
            message: 'Match found! You are the guest.'
        });

        console.log(`Match complete. PeerJS connection should now be established between ${player1.peerId} and ${player2.peerId}`);
    }
}

io.on('connection', (socket) => {
    console.log(`New socket connection: ${socket.id}`);

    // Handle player joining matchmaking queue
    socket.on('join_queue', (data) => {
        const { peerId } = data;
        
        if (!peerId) {
            socket.emit('error', { message: 'Peer ID is required' });
            return;
        }

        // Check if already in queue
        const alreadyInQueue = waitingQueue.some(player => player.socketId === socket.id);
        if (alreadyInQueue) {
            socket.emit('error', { message: 'Already in queue' });
            return;
        }

        // Add to queue
        waitingQueue.push({
            socketId: socket.id,
            peerId: peerId,
            timestamp: Date.now()
        });

        console.log(`Player ${socket.id} (${peerId}) joined queue. Queue size: ${waitingQueue.length}`);

        socket.emit('queue_update', {
            position: waitingQueue.length,
            message: 'Searching for opponent...'
        });

        // Try to match immediately
        matchPlayers();
    });

    // Handle player leaving queue (cancel search)
    socket.on('leave_queue', () => {
        removeFromQueue(socket.id);
        socket.emit('queue_left', { message: 'Left matchmaking queue' });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
        console.log(`Player disconnected: ${socket.id} (${reason})`);
        removeFromQueue(socket.id);
    });

    // Heartbeat to detect ghost connections
    socket.on('heartbeat', () => {
        // Update timestamp if player is in queue
        const player = waitingQueue.find(p => p.socketId === socket.id);
        if (player) {
            player.timestamp = Date.now();
        }
    });
});

// Cleanup old connections periodically
setInterval(() => {
    const now = Date.now();
    const expiredPlayers = waitingQueue.filter(player => now - player.timestamp > PLAYER_TIMEOUT);
    
    expiredPlayers.forEach(player => {
        console.log(`Removing expired player: ${player.socketId}`);
        removeFromQueue(player.socketId);
        
        // Notify the player if they're still connected
        const socket = io.sockets.sockets.get(player.socketId);
        if (socket) {
            socket.emit('timeout', { message: 'Search timed out. Please try again.' });
        }
    });
}, 10000); // Check every 10 seconds

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        queueSize: waitingQueue.length,
        uptime: process.uptime()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'PeerJS Matchmaking Broker Server',
        endpoints: {
            socketEvents: {
                join_queue: 'Send { peerId } to join matchmaking',
                leave_queue: 'Leave matchmaking queue',
                match_found: 'Received when match is found',
                queue_update: 'Queue position updates',
                timeout: 'Search timeout notification'
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Matchmaking Broker Server running on port ${PORT}`);
    console.log(`Socket.io ready for connections`);
});