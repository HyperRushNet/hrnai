export default async function handler(req, res) {
  // Handle preflight OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins (use specific URL in production)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Handle POST request for AI response streaming
  if (req.method === 'POST') {
    const { messages } = req.body;

    // Validate the request body
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request body, "messages" array is required' });
    }

    // Set CORS headers for the response
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins (use specific URL in production)
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Set Content-Type for the streaming response (raw response)
    res.setHeader('Content-Type', 'application/json;charset=UTF-8');
    
    try {
      // Send the POST request to the external AI API
      const response = await fetch('https://text.pollinations.ai/openai?stream=true&model=mistral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Streaming the response to the client
      let done = false;
      let result = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        result += decoder.decode(value, { stream: true });

        // Split the response by lines to process them individually
        const lines = result.split('\n');
        result = '';  // Clear the result for the next chunk

        // Process each line in the chunk
        for (const line of lines) {
          // Only process lines that start with "data:"
          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6).trim(); // Remove "data: "
            
            if (jsonStr === '[DONE]') {
              // End of stream, ignore this line
              continue;
            }

            try {
              const parsedData = JSON.parse(jsonStr);
              // Extract and send only the 'content' part from the JSON response
              if (parsedData.choices && parsedData.choices[0] && parsedData.choices[0].delta && parsedData.choices[0].delta.content) {
                const content = parsedData.choices[0].delta.content;
                res.write(content); // Stream the 'content' part to the client
              }
            } catch (error) {
              console.error('Error processing JSON:', error);
            }
          }
        }

        // End the loop when the external API signals '[DONE]'
        if (result.includes('data: [DONE]')) {
          break;
        }
      }

      // End the response once the data is fully streamed
      res.end();

    } catch (error) {
      console.error('Error streaming raw AI response:', error);
      return res.status(500).json({ error: 'Error processing the AI response' });
    }
  } else {
    // Handle unsupported HTTP methods
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}
