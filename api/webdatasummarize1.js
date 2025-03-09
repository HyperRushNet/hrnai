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
            // Haal het bericht en zoekterm op uit het verzoek
            const { message } = req.body;
            const { search } = req.query;  // Haal de 'search' parameter uit de URL

            if (!message || message.length === 0) {
                return res.status(400).send("Geen bericht ontvangen.");
            }

            if (!search || search.length === 0) {
                return res.status(400).send("Geen zoekterm ontvangen.");
            }

            // Vervang "nigg" met "🅽🅸🅶🅶"
            const sanitizedMessage = message.replace(/nigg/gi, "🅽🅸🅶🅶");

            // Genereer een willekeurig nummer tussen 1 en 1000
            const randomSeed = Math.floor(Math.random() * 1000) + 1;

            // Systeem prompt voor de AI, met de zoekterm
            const systemPrompt = `You are going to get a huge text that comes from content-main of a webpage. The user is first going to give an objective for you to scan in the text and you need to give all information about it as short as possible. The objective is: ${search}. If the text doesn't have any information about the objective, say what the text is about and give an error message but only give answers based on data in the text, not your database. If there is information around the subject that isn't from another subject, you can use it.`; // Zoekterm toevoegen aan de prompt

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
