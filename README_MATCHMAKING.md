# ELUNO MIRROR - Automated Matchmaking System

This guide explains how to set up the new automated matchmaking system for your PeerJS P2P card game.

## Overview

The system replaces the manual "Create/Join Room" with an automated "Find Match" system using a central Broker Server that maintains a waiting queue and pairs players automatically.

## Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Player 1  │         │  Broker Server   │         │   Player 2  │
│  (PeerJS)   │◄───────►│  (Socket.io)     │◄───────►│  (PeerJS)   │
└─────────────┘         └──────────────────┘         └─────────────┘
                              │
                    Maintains waiting queue
                    Assigns roles (Host/Guest)
                    Exchanges Peer IDs
```

## Setup Instructions

### 1. Broker Server Setup

#### Option A: Local Development

```bash
# Navigate to the project directory
cd d:\pinjem\vscode\app1

# Install dependencies
npm install

# Start the server
npm start
# or for development with auto-restart
npm run dev
```

The server will run on `http://localhost:3000` by default.

#### Option B: Production Deployment (Recommended)

**Using Glitch.com (Free & Easy):**

1. Go to [glitch.com](https://glitch.com)
2. Click "New Project" → "Create a Node.js app"
3. Copy the contents of `matchmaker.js` to `server.js`
4. Copy the contents of `package.json` to `package.json`
5. Click "Tools" → "Terminal" and run `refresh` to install dependencies
6. Your broker URL will be `https://your-project-name.glitch.me`

**Using Render.com:**

1. Create a new Web Service
2. Connect your GitHub repository containing `matchmaker.js` and `package.json`
3. Set build command to `npm install`
4. Set start command to `node matchmaker.js`
5. Deploy and get your URL

### 2. Update Client Configuration

Edit `card4.html` and find this line:

```javascript
const BROKER_URL = "http://localhost:3000";
```

Replace it with your deployed broker URL:

```javascript
const BROKER_URL = "https://your-broker-url.com"; // Your actual broker URL
```

### 3. Testing the System

#### Local Testing (Two Browser Tabs)

1. **Start the broker server** (see step 1)
2. **Open Tab 1**: Load `card4.html` → Click "FIND MATCH"
3. **Open Tab 2**: Load `card4.html` → Click "FIND MATCH"
4. **Wait**: Both tabs should automatically connect and start the game

#### Testing with Friends

1. Deploy the broker server (see Option B above)
2. Share your HTML file with a friend
3. Both of you click "FIND MATCH" at the same time
4. The system will automatically pair you

## How It Works

### Matchmaking Flow

1. **Player clicks "FIND MATCH"**
   - Client loads Socket.io dynamically
   - Connects to broker server
   - Generates PeerJS ID
   - Sends ID to broker

2. **Broker maintains queue**
   - Adds player to waiting queue
   - Sends queue position updates
   - Checks for pairs every time someone joins

3. **When 2 players are found**
   - Broker assigns roles:
     - First player: **HOST** (initiates PeerJS connection)
     - Second player: **GUEST** (waits for connection)
   - Sends `match_found` event to both with opponent's Peer ID

4. **Players connect directly**
   - Host calls guest using PeerJS
   - Game starts automatically
   - Broker is no longer needed for that session

### Role Assignment Logic

```javascript
// Broker assigns roles
{
  role: 'host',        // This player initiates connection
  opponentId: 'xyz',   // Peer ID of opponent
  message: '...'
}

{
  role: 'guest',       // This player waits for connection
  opponentId: 'abc',   // Peer ID of opponent
  message: '...'
}
```

## Features

### Automatic Queue Management
- Players are automatically matched when 2 are waiting
- Queue position updates in real-time
- 30-second timeout prevents ghost connections

### Connection Reliability
- Uses `{ reliable: true }` flag for PeerJS
- Automatic reconnection handling
- Clean disconnection detection

### Error Handling
- Broker offline detection
- PeerJS connection failures
- Network timeout handling
- User-friendly error messages

### UI States
- **Searching**: Looking for opponent
- **Connecting**: Match found, establishing P2P
- **Game**: Playing the match

## Troubleshooting

### "Broker Offline" Error
- Check if server is running: `curl https://your-broker-url.com/health`
- Verify CORS settings if deployed
- Check browser console for specific errors

### "Connection Failed" After Match Found
- Ensure PeerJS is not blocked by firewall/ad-blocker
- Check that both players have working WebRTC
- Verify broker URL is correct in HTML

### Players Not Matching
- Check broker server logs for queue status
- Verify both players click "Find Match" around the same time
- Check if queue cleanup is working properly

### Socket.io Loading Issues
- Some browsers block CDN scripts
- Try loading Socket.io from a different CDN
- Check browser console for script loading errors

## Security Considerations

1. **No sensitive data** passes through the broker
2. **Peer IDs** are temporary and session-specific
3. **Game data** flows directly between players (P2P)
4. **Broker only** handles matchmaking, not game logic

## Performance Notes

- Broker server uses minimal resources
- No persistent storage needed
- Memory-only queue system
- Automatic cleanup of old connections

## API Reference

### Broker Events

**Client → Server:**
- `join_queue { peerId: string }` - Join matchmaking
- `leave_queue` - Leave matchmaking
- `heartbeat` - Keep connection alive

**Server → Client:**
- `queue_update { position: number, message: string }`
- `match_found { role: 'host'|'guest', opponentId: string }`
- `timeout { message: string }`
- `error { message: string }`

### PeerJS Events (Client)

- `peer.on('open')` - Peer ID generated
- `peer.on('connection')` - Incoming connection (guest)
- `peer.on('error')` - Connection errors
- `conn.on('open')` - P2P connection ready
- `conn.on('data')` - Game data received
- `conn.on('close')` - Opponent disconnected

## Next Steps

1. **Deploy the broker** to a production server
2. **Update the BROKER_URL** in your HTML file
3. **Test with a friend** to verify everything works
4. **Monitor the broker** logs for any issues
5. **Consider adding** rate limiting if needed

## Support

For issues with:
- **Broker server**: Check `matchmaker.js` logs
- **PeerJS connection**: Check browser console
- **Game logic**: Refer to original `card4.html` documentation

The matchmaking system is now ready to use! Players can simply click "FIND MATCH" and the system handles everything automatically.