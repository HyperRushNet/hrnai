export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');  // Allow all origins or specify your domain
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

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
    let newContent = ''; // Store new content to avoid duplication

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      result += decoder.decode(value, { stream: true });

      // Split the result by newlines and process each line individually
      const lines = result.split('\n');
      result = '';  // Clear result for the next loop iteration

      // Extract the new content
      lines.forEach((line) => {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6).trim();
          if (jsonStr === '[DONE]') return;

          try {
            const parsedData = JSON.parse(jsonStr);
            parsedData.choices.forEach((choice) => {
              if (choice.delta && choice.delta.content) {
                // Only add the new content
                newContent = choice.delta.content;
              }
            });
          } catch (error) {
            console.error('Fout bij het verwerken van de JSON:', error);
          }
        }
      });

      // Stream only the new content to the client
      if (newContent) {
        writer(newContent);
        newContent = ''; // Clear the new content after sending
      }

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
