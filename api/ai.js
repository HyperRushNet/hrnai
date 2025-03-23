// api/stream.js (Vercel serverless function)
module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        // Verkrijg de systeeminstructie en bestandsdata uit de request body
        const { systemInstruction, fileData } = req.body;
        
        // Stel de request body samen
        const requestBody = {
            messages: [
                { role: "system", content: "Je bent een behulpzame AI-assistent." },
                { role: "user", content: systemInstruction },
            ]
        };

        if (fileData) {
            requestBody.messages.push({
                role: "user",
                content: [{ type: "image_url", image_url: { url: fileData } }],
            });
        }

        // Maak de API-aanroep naar Pollinations AI
        const dataStream = await fetch('https://text.pollinations.ai/openai?stream=true&model=mistral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        const reader = dataStream.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let result = '';

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            result += decoder.decode(value, { stream: true });

            // Verwerk de ontvangen data en stuur de content
            processData(result, res);

            // Stop de loop als '[DONE]' is ontvangen
            if (result.includes('[DONE]')) {
                break;
            }
        }

    } catch (error) {
        console.error('Fout bij het ophalen van de data:', error);
        res.write(`data: "Er is een fout opgetreden."\n\n`);
    }
};

// Functie om de data te verwerken en enkel de tekst door te sturen
function processData(data, res) {
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
                console.error('Fout bij het verwerken van de JSON:', error);
            }
        }
    });

    // Verstuur de inhoud als een nieuwe regel via Server-Sent Events
    if (content) {
        res.write(`data: ${content}\n\n`);
    } else {
        res.write(`data: "Geen reacties beschikbaar."\n\n`);
    }
}
