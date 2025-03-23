// api/fetchData.js
export default async function handler(req, res) {
  try {
    // Voer een GET-verzoek uit naar de opgegeven URL
    const response = await fetch('https://text.pollinations.ai/hi,%20maak%20een%20html%20code%20voor%20een%20gamesite%20clone?stream=true');
    
    // Wacht op de tekst die de response bevat
    const text = await response.text();
    
    // Splits de data op basis van 'data:' om meerdere data-blokken te extraheren
    const dataBlocks = text.split('data:').filter(block => block.trim() !== '');
    let aiOutput = '';

    // Verwerk elk data-blok
    dataBlocks.forEach(block => {
        // Verwijder [DONE] en zorg dat we alleen geldig JSON verwerken
        const jsonData = block.trim();
        
        if (jsonData === '[DONE]') {
            return; // Sla deze block over, omdat het geen geldige gegevens bevat
        }

        try {
            // Probeer de data te parsen en de inhoud van delta.content toe te voegen aan de output
            const parsedBlock = JSON.parse(jsonData);
            const content = parsedBlock.choices.map(choice => choice.delta.content).join(""); // Geen extra spaties toevoegen
            aiOutput += content; // Plak de inhoud van delta.content naadloos aan elkaar
        } catch (error) {
            aiOutput += "Fout: Ongeldige JSON in een van de blokken.\n";
        }
    });

    // Stuur de geformatteerde output terug naar de client
    res.status(200).json({ output: aiOutput.trim() });

  } catch (error) {
    res.status(500).json({ error: "Er is iets misgegaan bij het ophalen van de gegevens." });
  }
}
