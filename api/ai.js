// api/fetchData.js
import axios from 'axios';

export default async function handler(req, res) {
  try {
    // Fetch data from the URL (streaming data)
    const streamUrl = 'https://text.pollinations.ai/hallo,%20hoe%20gaat%20het?stream=true';
    
    // Axios does not natively support streaming, so we use native fetch for stream handling
    const response = await fetch(streamUrl);
    
    // Check if the request is successful
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch data from the API' });
    }

    // Initialize variables to store the response chunks and result
    let chunks = '';
    const result = [];

    // Stream the data (handle the chunks)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      const chunk = decoder.decode(value, { stream: true });
      chunks += chunk;

      // Process each chunk as it comes in
      try {
        const data = JSON.parse(chunk); // Parse the chunk data (it's in JSON format)

        // Process the choices (content)
        if (data.choices && Array.isArray(data.choices)) {
          data.choices.forEach((choice) => {
            const content = choice.delta?.content || '';
            const contentFilter = choice.content_filter_results || {};

            // Skip content if it's filtered (e.g., hate, self-harm, etc.)
            if (contentFilter.hate?.filtered) return;
            if (contentFilter.self_harm?.filtered) return;
            if (contentFilter.sexual?.filtered) return;
            if (contentFilter.violence?.filtered) return;

            // Add valid content to the result
            if (content) {
              result.push(content);
            }
          });
        }
      } catch (err) {
        console.error('Error processing chunk:', err);
      }
    }

    // Once done streaming, return the processed result
    res.status(200).json({ processedContent: result.join('') });
    
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
