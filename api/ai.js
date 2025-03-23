export default async function handler(req, res) {
    try {
        // Voer de externe API-aanroep uit
        const response = await fetch('https://text.pollinations.ai/hi,%20maak%20een%20html%20code%20voor%20een%20netflix%20clone?stream=true');
        
        // Haal de tekst op uit de response
        const text = await response.text();
        
        // Verdeel de data in blokken
        const dataBlocks = text.split('data:').filter(block => block.trim() !== '');
        let aiOutput = '';

        // Verwerk elk blok en voeg de inhoud samen
        dataBlocks.forEach(block => {
            const jsonData = block.trim();
            if (jsonData === '[DONE]') return;  // Skip [DONE] blokken

            try {
                const parsedBlock = JSON.parse(jsonData);
                const content = parsedBlock.choices.map(choice => choice.delta.content).join(""); // Voeg inhoud samen
                aiOutput += content; // Voeg de inhoud toe aan de output
            } catch (error) {
                aiOutput += "Fout: Ongeldige JSON in een van de blokken.\n";
            }
        });

        // Verstuur de AI-output terug naar de client
        res.status(200).json({ output: aiOutput.trim() });

    } catch (error) {
        res.status(500).json({ error: 'Fout: Er is iets misgegaan bij het ophalen van de gegevens.' });
    }
}
