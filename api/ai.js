export default async function handler(req, res) {
    // Zorg ervoor dat de juiste headers worden meegegeven voor Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Directe headers naar de client sturen

    try {
        // Voer een GET-verzoek uit naar de opgegeven URL (of een andere API die je gebruikt)
        const response = await fetch('https://text.pollinations.ai/hi,%20maak%20een%20html%20code%20voor%20een%20netflix%20clone?stream=true');

        // Controleer of de response succesvol is
        if (!response.ok) {
            res.status(500).json({ error: "Fout bij het ophalen van de gegevens." });
            return;
        }

        // Wacht op de tekst die de response bevat
        const text = await response.text();

        // Split de data op basis van 'data:' om meerdere data-blokken te extraheren
        const dataBlocks = text.split('data:').filter(block => block.trim() !== '');
        
        // Loop door elk data blok en stuur het naar de client
        for (const block of dataBlocks) {
            const jsonData = block.trim();

            if (jsonData === '[DONE]') {
                continue; // Sla de [DONE] blokken over
            }

            try {
                // Probeer de data te parsen
                const parsedBlock = JSON.parse(jsonData);
                const content = parsedBlock.choices.map(choice => choice.delta.content).join(""); // Geen extra spaties

                // Verstuur de inhoud naar de client (via SSE)
                if (content) {
                    res.write(`data: ${content}\n\n`);
                    res.flush(); // Zorg ervoor dat de data direct wordt verzonden naar de client
                }
            } catch (error) {
                // Als er een fout is bij het parsen van JSON, stuur dan een foutmelding naar de client
                res.write(`data: Fout: Ongeldige JSON in een van de blokken.\n\n`);
                res.flush();
            }
        }

        // Zodra de verwerking is voltooid, stuur het 'done' event en sluit de verbinding
        res.write('event: done\n');
        res.end();

    } catch (error) {
        // Foutafhandeling als er iets misgaat bij het ophalen van de data
        console.error("Fout bij het ophalen van de gegevens:", error);
        res.status(500).json({ error: "Er is iets misgegaan bij het ophalen van de gegevens." });
    }
}
