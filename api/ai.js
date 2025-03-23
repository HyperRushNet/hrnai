export default async function handler(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();  // Zorg ervoor dat de headers direct worden verzonden

    try {
        // Voer de externe API-aanroep uit
        const response = await fetch('https://text.pollinations.ai/hi,%20maak%20een%20html%20code%20voor%20een%20netflix%20clone?stream=true');
        
        // Haal de tekst op uit de response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;

        // Start het streamen van de data
        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            const chunk = decoder.decode(value, { stream: true });

            // Splits de data in blokken
            const dataBlocks = chunk.split('data:').filter(block => block.trim() !== '');
            dataBlocks.forEach(block => {
                const jsonData = block.trim();
                if (jsonData === '[DONE]') {
                    res.end(); // Beëindig de verbinding wanneer [DONE] wordt ontvangen
                    return;
                }

                try {
                    const parsedBlock = JSON.parse(jsonData);
                    
                    // Haal de 'content' van het 'delta' object
                    const content = parsedBlock.choices.map(choice => choice.delta.content).join("");

                    // Als content niet leeg is, stuur het dan naar de frontend
                    if (content.trim()) {
                        res.write(`data: ${content.trim()}\n\n`);
                    }
                } catch (error) {
                    res.write(`data: Fout: Ongeldige JSON in een van de blokken.\n\n`);
                }
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Fout: Er is iets misgegaan bij het ophalen van de gegevens.' });
    }
}
