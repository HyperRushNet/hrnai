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
            const fullSystemInstruction = `Date info: ${dateText}\n\n${systemInstruction}`;

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
            const response = await fetch('https://text.pollinations.ai/openai?model=mistral', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json();
            return res.status(200).json({ message: data.choices[0]?.text || 'Geen reactie ontvangen' });

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
