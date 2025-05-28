import { WebSocketServer } from 'ws';
import OpenAI from 'openai';

const PORT = 3000;
const wss = new WebSocketServer({ port: PORT });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const clients = new Set();

wss.on('connection', (ws) => {
  console.log('🔌 New client connected');
  
  clients.add(ws);

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'image_with_prompt') {
        const { imageBase64, prompt } = message.payload;

        console.log('🖼️ Received image and prompt. Calling LLM...');

        // Fixed: Correct message structure for OpenAI API
        const stream = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
          stream: true,
        });

        // Stream the response chunks back to the client
        for await (const part of stream) {
          const textChunk = part.choices?.[0]?.delta?.content || '';
          if (textChunk) {
            ws.send(JSON.stringify({ type: 'llm_stream', payload: textChunk }));
          }
        }

        ws.send(JSON.stringify({ type: 'llm_stream_end' }));

      } else if (message.type === 'capture') {
        console.log('📤 Broadcasting image to clients');
        
        // Broadcast to all other clients (send the parsed message, not raw data)
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
    clients.delete(ws); // Remove client from set when disconnected
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    clients.delete(ws); // Remove client from set on error
  });
});

console.log(`🚀 WebSocket server running on ws://localhost:${PORT}`);