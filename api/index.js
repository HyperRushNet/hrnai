export default async function handler(req, res) {
    // CORS-instellingen (uitgeschakeld)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle OPTIONS request (voor CORS)
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        try {
            // Haal het bericht op uit het verzoek
            const { message } = req.body;

            if (!message || message.length === 0) {
                return res.status(400).send("Geen bericht ontvangen.");
            }

            // Vervang "nigg" met "🅽🅸🅶🅶"
            const sanitizedMessage = message.replace(/nigg/gi, "🅽🅸🅶🅶");

            // Genereer een willekeurig nummer tussen 1 en 1000
            const randomSeed = Math.floor(Math.random() * 1000) + 1;

            // Systeem prompt voor de AI
            const systemPrompt = `Respond in these markdown codes: **bold**, *italic*, ***bold and itallic*** # title and --- for a hr line. Please don't use the line too often. Only # Exists, not ## or anything else. Always put an empty line underneath a title in your reponse. Make it easy to understand and clean.`; // Laat de rest van de prompt ongewijzigd

            // Maak het bericht voor de AI
            const messages = [
                { "role": "user", "content": sanitizedMessage },
                { "role": "system", "content": systemPrompt }
            ];

            // Functie om het bericht naar de AI te sturen en te proberen bij falen
            const sendRequestToAI = async (attempt = 1) => {
                try {
                    const response = await fetch(`https://text.pollinations.ai/openai?seed=${randomSeed}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ messages, max_tokens: 100 })
                    });

                    if (!response.ok) throw new Error("Fout bij het aanroepen van de AI API.");

                    const data = await response.json();

                    if (data.choices && data.choices.length > 0) {
                        return data.choices[0].message.content;
                    } else {
                        throw new Error("Geen antwoord gevonden in de AI response.");
                    }
                } catch (error) {
                    if (attempt < 3) {
                        console.log(`Poging ${attempt} mislukt, probeer opnieuw...`);
                        return await sendRequestToAI(attempt + 1);
                    } else {
                        throw new Error("Er is iets mis gegaan bij het verwerken van je aanvraag.");
                    }
                }
            };

            let aiMessage = await sendRequestToAI();

            // Controleer of "🅽🅸🅶🅶" in de AI-respons staat en vervang het terug door "nigg"
            aiMessage = aiMessage.replace(/🅽🅸🅶🅶/g, "nigg");

            // Verstuur het aangepaste AI-antwoord terug naar de client
            res.status(200).send(aiMessage);

        } catch (error) {
            console.error("Fout bij API-aanroep:", error);
            res.status(500).send("Er is iets mis gegaan bij het verwerken van je aanvraag.");
        }
    } else {
        res.status(405).send("Alleen POST-aanvragen zijn toegestaan.");
    }
}
