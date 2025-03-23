export default async function handler(req, res) {
    try {
        // Stel de response headers in voor streaming
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Start het fetch-verzoek naar de API met streaming
        const response = await fetch('https://text.pollinations.ai/hi,%20maak%20een%20html%20code%20voor%20een%20netflix%20clone?stream=true');

        // Check of de response succesvol is
        if (!response.ok) {
            throw new Error('Er is een fout bij het ophalen van de gegevens');
        }

        // Zet de response body om in een readable stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let aiOutput = '';
        let done = false;

        // Begin met het lezen van de stream
        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            
            // Decodeer de waarde van de stream (de chunk)
            const chunk = decoder.decode(value, { stream: true });

            // Split de chunk op basis van 'data:' en filter lege blokken eruit
            const dataBlocks = chunk.split('data:').filter(block => block.trim() !== '');

            // Verwerk elk data-blok
            dataBlocks.forEach(block => {
                const jsonData = block.trim();

                // Sla '[DONE]' over, omdat dit aangeeft dat de stream klaar is
                if (jsonData === '[DONE]') {
                    return;
                }

                try {
                    // Parseer het JSON blok
                    const parsedBlock = JSON.parse(jsonData);

                    // Verkrijg de inhoud van de keuzes en voeg dit toe aan de output
                    const content = parsedBlock.choices.map(choice => choice.delta.content).join('');
                    
                    // Zorg ervoor dat we alleen de nieuwe content toevoegen (zonder herhalingen)
                    if (content) {
                        aiOutput += content;
                        
                        // Stuur de gedeeltelijke output naar de client
                        res.write(JSON.stringify({ output: aiOutput }));
                    }
                } catch (error) {
                    console.error('Fout bij het verwerken van een JSON-blok:', error);
                }
            });
        }

        // Markeer het einde van de streaming response
        res.end();
    } catch (error) {
        console.error('Er is een fout opgetreden bij het ophalen van de data:', error);
        res.status(500).json({ error: 'Er is iets misgegaan bij het ophalen van de gegevens.' });
    }
}
