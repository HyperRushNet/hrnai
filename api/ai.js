// api/stream.js (Vercel serverless function)
module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        const dataStream = await fetch('https://text.pollinations.ai/openai?stream=true&model=mistral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: "Je bent een behulpzame AI-assistent." },
                    { role: "user", content: "Hallo, hoe gaat het?" },
                ]
            })
        });

        const reader = dataStream.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let result = '';

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            result += decoder.decode(value, { stream: true });

            // Zoek naar de 'content' tekst in de stream en stuur het als een nieuwe regel
            if (result.includes('content":"')) {
                // Haal de tekst na "content":" en vóór de volgende quote (") eruit
                const contentStart = result.indexOf('content":"') + 10;  // 10 is de lengte van 'content":"'
                const contentEnd = result.indexOf('"', contentStart);
                const aiContent = result.substring(contentStart, contentEnd);

                // Verstuur de tekst via Server-Sent Events
                res.write(`data: ${aiContent}\n\n`);

                // Reset de result string na het sturen van de content
                result = result.slice(contentEnd);
            }

            // Stop als '[DONE]' in de response wordt gevonden
            if (result.includes('[DONE]')) {
                break;
            }
        }

    } catch (error) {
        console.error('Fout bij het ophalen van de data:', error);
        res.write(`data: "Er is een fout opgetreden."\n\n`);
    }
};
