// api/ask.js

const fetch = require('node-fetch'); // Zorg ervoor dat je node-fetch hebt geïnstalleerd

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        try {
            const { systemInstruction, fileData } = req.body;  // Ontvang de systeemopdracht en het bestand

            if (!systemInstruction && !fileData) {
                return res.status(400).json({ error: 'Please provide a question or upload an image.' });
            }

            // Haal de datuminformatie op
            const dateText = await fetchDateText();
            const fullSystemInstruction = `Date info, only use when needed in 24h time: ${dateText}\n\n${systemInstruction}`;

            // Voor de bestandsupload kun je de fileData verder verwerken als dat nodig is.
            // Als het bestand een base64 geëncodeerde string is, zou je die kunnen verwerken.

            // Stel de requestbody voor de API in
            const requestBody = {
                messages: [
                    { role: "system", content: "Je bent een behulpzame AI-assistent." },
                    { role: "user", content: fullSystemInstruction },
                ],
            };

            if (fileData) {
                requestBody.messages.push({
                    role: "user",
                    content: [{ type: "image_url", image_url: { url: fileData } }],
                });
            }

            // Verzend de API-aanroep naar de externe OpenAI API (of andere API)
            const response = await fetch('https://text.pollinations.ai/openai?stream=true&model=mistral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let result = '';

            // Lees de stream en verzamel de gegevens
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                result += decoder.decode(value, { stream: true });

                // Verwerk de data
                const processedData = processData(result);
                if (processedData) {
                    return res.status(200).json({ message: processedData });
                }

                if (result.includes('data: [DONE]')) {
                    break;
                }
            }
        } catch (error) {
            console.error('Fout bij het ophalen van de data:', error);
            return res.status(500).json({ error: 'Er is een fout opgetreden bij het verwerken van de gegevens.' });
        }
    } else {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
};

// Functie om de datum op te halen
async function fetchDateText() {
    try {
        const response = await fetch('https://hrnai.vercel.app/api/date');
        return await response.text();
    } catch (error) {
        console.error('Error fetching date text:', error);
        return '';
    }
}

// Functie om de data te verwerken uit de stream
function processData(data) {
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
                console.error('Error processing JSON:', error);
            }
        }
    });

    return content || null;
}
