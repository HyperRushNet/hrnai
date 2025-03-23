const fetch = require('node-fetch'); // Nodig voor het maken van HTTP-verzoeken in Node.js

module.exports = async (req, res) => {
    // Haal de data uit de POST body
    const { systemInstruction, fileData } = req.body;

    if (!systemInstruction && !fileData) {
        return res.status(400).json({ message: "Please provide a question or upload an image." });
    }

    // Verkrijg de datumtekst
    const dateText = await fetchDateText();
    const fullSystemInstruction = `Date info, only use when needed in 24h time: ${dateText}\n\n${systemInstruction}`;

    // Stel het request body in
    const requestBody = {
        messages: [
            { role: "system", content: "Je bent een behulpzame AI-assistent." },
            { role: "user", content: fullSystemInstruction }
        ]
    };

    if (fileData) {
        requestBody.messages.push({
            role: "user",
            content: [{ type: "image_url", image_url: { url: fileData } }],
        });
    }

    try {
        const response = await fetch('https://text.pollinations.ai/openai?stream=true&model=mistral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let result = '';

        // Start de stream en stuur de data terug naar de client
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');
        
        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            result += decoder.decode(value, { stream: true });

            // Verwerk de data per stuk en stuur dit naar de client
            res.write(JSON.stringify({ message: result }));

            if (result.includes('data: [DONE]')) {
                break;
            }
        }

        res.end();
    } catch (error) {
        console.error('Fout bij het ophalen van de data:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

// Functie om de datuminformatie op te halen
async function fetchDateText() {
    try {
        const response = await fetch('https://hrnai.vercel.app/api/date');
        return await response.text();
    } catch (error) {
        console.error('Error fetching date text:', error);
        return '';
    }
}
