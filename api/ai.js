// api/stream-response.js
const fetch = require('node-fetch');

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const systemInstruction = req.query.systemInstruction;

    if (!systemInstruction) {
        return res.status(400).json({ error: 'System instruction is required' });
    }

    try {
        // Verkrijg de datum-informatie
        const dateResponse = await fetch('https://hrnai.vercel.app/api/date');
        const dateText = await dateResponse.text();
        const fullSystemInstruction = `Date info, only use when needed in 24h time: ${dateText}\n\n${systemInstruction}`;

        // De API request naar OpenAI (of een andere AI model API)
        const openAIRequestBody = {
            messages: [
                { role: "system", content: "Je bent een behulpzame AI-assistent." },
                { role: "user", content: fullSystemInstruction }
            ]
        };

        const openAIResponse = await fetch('https://text.pollinations.ai/openai?stream=true&model=mistral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(openAIRequestBody),
        });

        if (!openAIResponse.body) {
            return res.status(500).json({ error: 'Failed to get response from AI model' });
        }

        // We gebruiken een ReadableStream om de response in real-time door te sturen naar de client
        const reader = openAIResponse.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let result = '';

        res.setHeader('Content-Type', 'text/plain'); // We sturen de reactie in platte tekst

        // Streamen van de data in real-time naar de client
        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            result += decoder.decode(value, { stream: true });

            // Stuur de data naar de client zodra we een stukje ontvangen
            res.write(result);

            // Stop met streamen als we '[DONE]' zien
            if (result.includes('data: [DONE]')) {
                break;
            }
        }

        // Zorg ervoor dat we de response afsluiten
        res.end();
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while processing your request' });
    }
}
