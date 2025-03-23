const fetch = require('node-fetch'); // Nodig voor het maken van HTTP-verzoeken in Node.js

module.exports = async (req, res) => {
    console.log("Received request:", req.method);  // Log request method
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // Zorg ervoor dat we de body goed kunnen verwerken
    const { systemInstruction, fileData } = req.body;
    console.log("System Instruction:", systemInstruction);  // Log systemInstruction
    console.log("File Data:", fileData ? "File provided" : "No file");  // Log if file data is provided

    if (!systemInstruction && !fileData) {
        console.error("No valid data provided!");
        return res.status(400).json({ message: "Please provide a question or upload an image." });
    }

    try {
        console.log("Fetching date text...");
        const dateText = await fetchDateText();
        console.log("Fetched date text:", dateText);  // Log the date text received
        const fullSystemInstruction = `Date info, only use when needed in 24h time: ${dateText}\n\n${systemInstruction}`;
        console.log("Full system instruction:", fullSystemInstruction);

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

        console.log("Sending request to AI API...");
        const response = await fetch('https://text.pollinations.ai/openai?stream=true&model=mistral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response from AI API:", errorText);
            return res.status(response.status).json({ message: 'AI API request failed', details: errorText });
        }

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
        console.error('Error during function execution:', error);
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
