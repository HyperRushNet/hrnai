export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins (for development, use specific origins in production)
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const response = await fetch('https://text.pollinations.ai/openai?stream=true&model=mistral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const writer = res.write.bind(res); // Use Vercel's response object to stream data

    let done = false;
    let result = '';

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      result += decoder.decode(value, { stream: true });

      // Stream the content to the client as soon as it is received
      writer(result);

      // Optionally, break the loop once we encounter '[DONE]'
      if (result.includes('data: [DONE]')) {
        break;
      }
    }
    
  } catch (error) {
    console.error('Error in streaming AI response:', error);
    return res.status(500).json({ error: 'Error processing the AI response' });
  }
}
