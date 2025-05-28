import { WebSocketServer } from 'ws';

const PORT = 3000;
const wss = new WebSocketServer({ port: PORT });

const clients = new Set();

wss.on('connection', (ws) => {
  console.log('🔌 New client connected');
  clients.add(ws);

  ws.on('message', (data) => {
    console.log('📤 Broadcasting image to clients');

    // Broadcast to all other clients
    for (const client of clients) {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(data);
      }
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
    clients.delete(ws);
  });
});

console.log(`🚀 WebSocket server running on ws://localhost:${PORT}`);
