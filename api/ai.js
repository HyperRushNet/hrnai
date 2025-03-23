export default async function handler(req, res) {
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');  // Replace '*' with your frontend URL for security in production
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Handle POST request (AI request)
  if (req.method === 'POST') {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');  // Replace '*' with your frontend URL for security in production
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
      let previousContent = '';  // To store previously sent content and avoid repetition

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        result += decoder.decode(value, { stream: true });

        // Process the current chunk of data and avoid sending repeated content
        const newContent = extractNewContent(result, previousContent);

        // Only send new content that hasn't been sent already
        if (newContent) {
          writer(newContent);  // Send new content to the client
          previousContent = newContent;  // Update previousContent with the new content
        }

        // Break if '[DONE]' is encountered in the result
        if (result.includes('data: [DONE]')) {
          break;
        }
      }

    } catch (error) {
      console.error('Error in streaming AI response:', error);
      return res.status(500).json({ error: 'Error processing the AI response' });
    }
  } else {
    // Handle other methods (GET, PUT, etc.) if needed
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}

// Helper function to extract new content and avoid repeating previously sent content
function extractNewContent(data, previousContent) {
  const lines = data.split('\n');
  let content = '';

  lines.forEach((line) => {
    if (line.startsWith('data: ')) {
      const jsonStr = line.substring(6).trim();
      if (jsonStr === '[DONE]') return;

      try {
        const parsedData = JSON.parse(jsonStr);
        parsedData.choices.forEach((choice) => {
          if (choice.delta && choice.delta.content) {
            content += choice.delta.content;
          }
        });
      } catch (error) {
        console.error('Fout bij het verwerken van de JSON:', error);
      }
    }
  });

  // Only return new content that hasn't been previously sent
  if (content !== previousContent) {
    return content;
  }

  return '';  // Return an empty string if there's no new content
}
