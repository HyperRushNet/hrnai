export default async function handler(req, res) {
    // Zorg ervoor dat de client de juiste header ontvangt voor SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    try {
        // Voer een GET-verzoek uit naar de opgegeven URL
        const response = await fetch('https://text.pollinations.ai/hi,%20maak%20een%20html%20code%20voor%20een%20spotify%20clone?stream=true');

        // Controleer of de response succesvol is
        if (!response.ok) {
            res.status(500).json({ error: "Fout bij het ophalen van de gegevens." });
            return;
        }

        // Wacht op de tekst die de response bevat
        const text = await response.text();

        // Splits de data op basis van 'data:' om meerdere data-blokken te extraheren
        const dataBlocks = text.split('data:').filter(block => block.trim() !== '');
        let aiOutput = '';

        // Verwerk elk data-blok en verstuur stapsgewijs naar de client
        for (const block of dataBlocks) {
            // Verwijder [DONE] en zorg dat we alleen geldig JSON verwerken
            const jsonData = block.trim();
            
            if (jsonData === '[DONE]') {
                continue; // Sla deze block over, omdat het geen geldige gegevens bevat
            }

            try {
                // Probeer de data te parsen en de inhoud van delta.content toe te voegen aan de output
                const parsedBlock = JSON.parse(jsonData);
                const content = parsedBlock.choices.map(choice => choice.delta.content).join(""); // Geen extra spaties toevoegen
                aiOutput += content; // Voeg de inhoud van delta.content toe aan de output

                // Verstuur de content in kleine deeltjes (SSE)
                res.write(`data: ${content}\n\n`);
            } catch (error) {
                // Bij fout, geef een foutmelding (optioneel)
                res.write(`data: Fout: Ongeldige JSON in een van de blokken.\n\n`);
            }
        }

        // Sluit de verbinding na het versturen van alle data
        res.write('event: done\n');
        res.end();
    } catch (error) {
        console.error("Fout bij het ophalen van de gegevens:", error);
        res.status(500).json({ error: "Er is iets misgegaan bij het ophalen van de gegevens." });
    }
}
