export default async function handler(req, res) {
    try {
        // Voeg CORS-headers toe
        res.setHeader('Access-Control-Allow-Origin', '*');  // Allow requests from any domain
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST'); // Allow both GET and POST requests
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');  // Allow Content-Type header

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Zorg ervoor dat het een POST-verzoek is
        if (req.method === 'POST') {
            // Verkrijg de JSON-gegevens van de POST-body
            const { q, fileData } = req.body;

            if (!q) {
                return res.status(400).json({ message: 'Parameter q (systemInstruction) is vereist.' });
            }

            // Functie om de bestandgegevens door te sturen naar de externe API
            async function sendFileToServer(fileData, systemInstruction) {
                const requestBody = {
                    messages: [
                        { role: "system", content: "Je bent een behulpzame AI-assistent." },
                        { role: "user", content: systemInstruction }
                    ]
                };

                if (fileData) {
                    // Voeg de base64-afbeelding toe aan het verzoek
                    requestBody.messages.push({
                        role: "user",
                        content: [{ type: "image_data", image_base64: fileData }],
                    });
                }

                // Verstuur de data naar de externe API
                const externalApiResponse = await fetch('https://text.pollinations.ai/openai?stream=true&model=mistral', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                });

                // Verkrijg een stream van de body van de API-respons
                const reader = externalApiResponse.body.getReader();
                const decoder = new TextDecoder();
                let done = false;
                let result = '';

                // Stel de content-type header in voor streaming
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                
                // Start streamen en verstuur de nieuwe data naar de client
                while (!done) {
                    const { value, done: readerDone } = await reader.read();
                    done = readerDone;
                    result += decoder.decode(value, { stream: true });

                    // Verwijder de 'data: ' prefix en stop bij [DONE]
                    const cleanedResult = result
                        .split('\n')
                        .filter(line => line && !line.startsWith('data: [DONE]'))
                        .map(line => line.replace(/^data: /, '')) // Verwijder 'data: ' van elke regel
                        .join('\n');

                    // Verstuur de nieuwe data naar de client
                    if (cleanedResult) {
                        res.write(cleanedResult);  // Stuur de ruwe inhoud naar de client
                    }

                    // Zorg ervoor dat we stoppen met versturen als we de '[DONE]' string tegenkomen
                    if (result.includes('data: [DONE]')) {
                        break;
                    }
                }

                // Eindig de response
                res.end();
            }

            // Als er bestandgegevens zijn, gebruik dan de FileReader om de base64-string te verkrijgen
            if (fileData) {
                // Aangenomen dat de fileData al base64-gecodeerd is, zoals verwacht voor een API-call
                await sendFileToServer(fileData, q);
            } else {
                // Als er geen bestand is, stuur alleen de tekstinstructie
                await sendFileToServer(null, q);
            }
            
        } else {
            return res.status(405).json({ message: 'Method Not Allowed, only POST is supported.' });
        }

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Er is een fout opgetreden bij het verwerken van je aanvraag.");
    }
}
