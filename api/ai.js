import { Readable } from 'stream';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { messages } = req.body;

    // Check for necessary data
    if (!messages || messages.length === 0) {
        return res.status(400).json({ message: 'Messages are required' });
    }

    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const openAiApiKey = process.env.OPENAI_API_KEY;  // You need to add your OpenAI API key to Vercel's environment variables

    // Make the API request to OpenAI
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo', // Use the correct model for your needs
            messages: messages,
            stream: true,
        }),
    });

    // If there's an error with OpenAI's response, return an error
    if (!response.ok) {
        return res.status(response.status).json({ message: await response.text() });
    }

    // Set up the streaming response
    res.setHeader('Content-Type', 'text/plain;charset=utf-8');
    res.flushHeaders();  // Start sending the response immediately

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let result = '';

    // Stream the data to the client in chunks
    while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        result += decoder.decode(value, { stream: true });

        // Send the partial result to the client
        res.write(result);

        if (result.includes('[DONE]')) {
            break;
        }
    }

    // End the response when done
    res.end();
}
