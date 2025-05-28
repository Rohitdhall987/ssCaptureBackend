import { WebSocketServer } from 'ws';
import { Configuration, OpenAIApi } from 'openai';

const PORT = 3000;
const wss = new WebSocketServer({ port: PORT });

// Set up OpenAI API client with your secret key
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY, // set your env variable
});
const openai = new OpenAIApi(configuration);

wss.on('connection', (ws) => {
  console.log('🔌 New client connected');

  ws.on('message', async (data) => {
    try {
      // Assume data is JSON string with { type, payload }
      const message = JSON.parse(data.toString());

      if (message.type === 'image_with_prompt') {
        const { imageBase64, prompt } = message.payload;

        console.log('🖼️ Received image and prompt. Calling LLM...');

        // Call GPT-4 Vision (example, adjust API if needed)
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini', // replace with GPT-4 Vision or Gemini Vision model
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
                { role: 'user', content: prompt },
              ],
            },
          ],
          stream: true,
        });

        // Stream response back to client
        response.on('data', (chunk) => {
          // parse and forward partial text (adjust parsing to your actual API stream format)
          const textChunk = chunk.choices?.[0]?.delta?.content || '';
          if (textChunk) {
            ws.send(JSON.stringify({ type: 'llm_stream', payload: textChunk }));
          }
        });

        response.on('end', () => {
          ws.send(JSON.stringify({ type: 'llm_stream_end' }));
        });

      } else {
        console.log('⚠️ Unknown message type');
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
      ws.send(JSON.stringify({ type: 'error', payload: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
  });
});

console.log(`🚀 WebSocket server running on ws://localhost:${PORT}`);
