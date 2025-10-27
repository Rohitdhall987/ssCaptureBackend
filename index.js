import { WebSocketServer } from 'ws';
import { GoogleGenerativeAI } from '@google/generative-ai';
// import dotenv from 'dotenv';

// dotenv.config();

const PORT = 3000;
const wss = new WebSocketServer({ port: PORT });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('🔌 New client connected');
  clients.add(ws);

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'image_with_prompt') {
        const { imageBase64, prompt } = message.payload;

        console.log('🖼️ Received image and prompt. Calling Gemini...');

        // Decode base64 into Uint8Array
        // const imageBuffer = Uint8Array.from(Buffer.from(imageBase64, 'base64'));

        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash-image',
        });

        const result = await model.generateContent([
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/png', // or 'image/jpeg' for better compression
              data: imageBase64,
            },
          },
        ]);

        const text = result.response.text();
        ws.send(JSON.stringify({ type: 'llm_stream', payload: text }));
        ws.send(JSON.stringify({ type: 'llm_stream_end' }));

      } else if (message.type === 'capture') {
        console.log('📤 Broadcasting image to clients');

        const messageString = JSON.stringify(message);
        for (const client of clients) {
          if (client !== ws && client.readyState === client.OPEN) {
            client.send(messageString);
          }
        }

      } else {
        console.log('⚠️ Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
      ws.send(JSON.stringify({ type: 'error', payload: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    clients.delete(ws);
  });
});

console.log(`🚀 WebSocket server running on ws://localhost:${PORT}`);
