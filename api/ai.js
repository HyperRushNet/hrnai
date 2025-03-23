// api/stream.js
import { Readable } from 'stream';

export default async function handler(req, res) {
  // Ensure the request is a GET request
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Only GET method is allowed' });
  }

  try {
    // Extract query parameters
    const systemInstruction = req.query.systemInstruction || '';
    const fileData = req.query.fileData || null;

    // Fetch date text
    const dateText = await fetchDateText();
    const fullSystemInstruction = `Date info, only use when needed in 24h time: ${dateText}\n\n${systemInstruction}`;

    // Create the request body
    const requestBody = {
      messages: [
        { role: 'system', content: 'Je bent een behulpzame AI-assistent.' },
        { role: 'user', content: fullSystemInstruction },
      ],
    };

    if (fileData) {
      requestBody.messages.push({
        role: 'user',
        content: [{ type: 'image_url', image_url: { url: fileData } }],
      });
    }

    // Send request to external API
    const response = await fetch('https://text.pollinations.ai/openai?stream=true&model=mistral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    // Stream the response from the external API
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let result = '';

    res.setHeader('Content-Type', 'text/plain;charset=UTF-8');
    res.flushHeaders(); // Start sending the response

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      result += decoder.decode(value, { stream: true });

      // Process the data and stream it
      processData(result, res);

      // End when we receive the '[DONE]' signal
      if (result.includes('data: [DONE]')) {
        break;
      }
    }
  } catch (error) {
    console.error('Error in the handler:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

// Function to fetch the date text
async function fetchDateText() {
  try {
    const response = await fetch('https://hrnai.vercel.app/api/date');
    return await response.text();
  } catch (error) {
    console.error('Error fetching date text:', error);
    return '';
  }
}

// Function to process and stream the content
function processData(data, res) {
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
            res.write(content); // Send data as stream to the client
          }
        });
      } catch (error) {
        console.error('Error processing the JSON:', error);
      }
    }
  });

  if (content) {
    res.write(content); // Send the final content if any
  }
}
