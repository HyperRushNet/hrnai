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

            // Kijk of er nieuwe inhoud is in de response en stuur alleen de inhoud (zonder JSON structuur)
            const contentMatch = result.match(/"content":"(.*?)"/);
            if (contentMatch) {
                const aiContent = contentMatch[1];

                // Verstuur de tekst als nieuwe regel
                res.write(`data: ${aiContent}\n\n`);
            }

            // Stoppen als we '[DONE]' in de response vinden
            if (result.includes('data: [DONE]')) {
                break;
            }
        }

    } catch (error) {
        console.error('Fout bij het ophalen van de data:', error);
        res.write(`data: "Er is een fout opgetreden."\n\n`);
    }
};
