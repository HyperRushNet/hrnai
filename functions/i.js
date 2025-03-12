export default async function handler(req) {
    // CORS-instellingen
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };

    // Handle OPTIONS request (voor CORS)
    if (req.httpMethod === "OPTIONS") {
        return new Response(null, {
            status: 200,
            headers: headers
        });
    }

    if (req.httpMethod === 'POST') {
        try {
            // Haal het bericht op uit het verzoek
            const { message } = JSON.parse(req.body);

            if (!message || message.length === 0) {
                return new Response(JSON.stringify({ error: "Geen bericht ontvangen." }), {
                    status: 400,
                    headers: headers
                });
            }

            // Vervang "nigg" met "🅽🅸🅶🅶"
            const sanitizedMessage = message.replace(/nigg/gi, "🅽🅸🅶🅶");

            // Genereer een willekeurig nummer tussen 1 en 1000
            const randomSeed = Math.floor(Math.random() * 1000) + 1;

            // Systeem prompt voor de AI
            const systemPrompt = `Respond in pure text but when decorating text, use this cheatsheet: **bold**, *italic*, ***bold and itallic*** # title and --- for a hr line. Please don't use the line too often. Only # Exists, not ## or anything else. Always put an empty line underneath a title in your reponse. You almost never use those decorations exept when really needed.`;

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
                        body: JSON.stringify({ messages, max_tokens: 10 })
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
            return new Response(JSON.stringify({ message: aiMessage }), {
                status: 200,
                headers: headers
            });

        } catch (error) {
            console.error("Fout bij API-aanroep:", error);
            return new Response(JSON.stringify({ error: "Er is iets mis gegaan bij het verwerken van je aanvraag." }), {
                status: 500,
                headers: headers
            });
        }
    } else {
        return new Response(JSON.stringify({ error: "Alleen POST-aanvragen zijn toegestaan." }), {
            status: 405,
            headers: headers
        });
    }
}
