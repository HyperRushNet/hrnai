export default async function handler(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();  // Zorgt ervoor dat de headers direct worden verzonden

    try {
        // Voer de externe API-aanroep uit
        const response = await fetch('https://text.pollinations.ai/hi,%20maak%20een%20html%20code%20voor%20een%20netflix%20clone?stream=true');
        
        // Haal de tekst op uit de response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiOutput = '';
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
                if (jsonData === '[DONE]') return;  // Skip [DONE] blokken

                try {
                    const parsedBlock = JSON.parse(jsonData);
                    const content = parsedBlock.choices.map(choice => choice.delta.content).join("");
                    aiOutput += content;
                    
                    // Stuur het streamingresultaat naar de frontend
                    res.write(`data: ${aiOutput.trim()}\n\n`);
                } catch (error) {
                    aiOutput += "Fout: Ongeldige JSON in een van de blokken.\n";
                    res.write(`data: ${aiOutput}\n\n`);
                }
            });
        }

        res.end(); // Sluit de verbinding als de streaming is voltooid
    } catch (error) {
        res.status(500).json({ error: 'Fout: Er is iets misgegaan bij het ophalen van de gegevens.' });
    }
}
