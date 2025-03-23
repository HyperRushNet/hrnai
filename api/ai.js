export default async function handler(req, res) {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Replace '*' with your frontend URL in production
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Handle POST request (AI request)
  if (req.method === 'POST') {
    const { messages } = req.body;

    // If no messages are provided in the body, return an error
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Set CORS headers for the response
    res.setHeader('Access-Control-Allow-Origin', '*'); // Replace '*' with your frontend URL in production
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    try {
      // Forward the POST request to the external AI API and stream the response
      const response = await fetch('https://text.pollinations.ai/openai?stream=true&model=mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Set the correct content type for the response to be streamed
      res.setHeader('Content-Type', 'application/json;charset=UTF-8');
      
      // Stream the response from the external API directly to the client
      let done = false;
      let result = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        result += decoder.decode(value, { stream: true });

        // Stream the content as soon as it's available
        res.write(result);

        // If the response contains the '[DONE]' marker, stop streaming
        if (result.includes('data: [DONE]')) {
          break;
        }
      }

      // End the response when streaming is complete
      res.end();

    } catch (error) {
      console.error('Error streaming from the AI API:', error);
      return res.status(500).json({ error: 'Error processing the AI response' });
    }
  } else {
    // Handle other methods (GET, PUT, etc.)
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}
