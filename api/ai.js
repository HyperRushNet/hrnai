export default async function handler(req, res) {
  try {
    // Voer een GET-verzoek uit naar de opgegeven URL met stream=true
    const response = await fetch('https://text.pollinations.ai/hi,%20maak%20een%20html%20code%20voor%20een%20netflix%20clone?stream=true');

    // Controleer of de response succesvol is
    if (!response.ok) {
      res.status(500).json({ error: "Fout bij het ophalen van de gegevens." });
      return;
    }

    // Stel de headers in voor streaming
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // Maak een ReadableStream om de data stapsgewijs te verwerken
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aiOutput = '';

    // Functie om data te lezen en naar de client te streamen
    const streamData = async () => {
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        // Decodeer de ruwe data
        const chunk = decoder.decode(value, { stream: true });

        // Split de data op basis van 'data:' om meerdere blokken te extraheren
        const dataBlocks = chunk.split('data:').filter(block => block.trim() !== '');

        dataBlocks.forEach(block => {
          const jsonData = block.trim();

          if (jsonData === '[DONE]') {
            return; // Stop bij het [DONE] signaal
          }

          try {
            // Parse de data en voeg de inhoud van delta.content toe aan aiOutput
            const parsedBlock = JSON.parse(jsonData);

            // Zorg ervoor dat we alleen de inhoud van delta.content gebruiken
            const content = parsedBlock.choices?.map(choice => choice.delta?.content).join("") || "";

            // Als content is gevonden, zend deze naar de client
            if (content) {
              res.write(content);
            }
          } catch (error) {
            // Negeer de fout als de data niet geldig is en ga verder met het streamen van de volgende
            console.error("Fout bij het parsen van JSON:", error);
          }
        });
      }
    };

    // Start het streamen van data
    await streamData();

    // Eindig de stream als alles is verzonden
    res.end();

  } catch (error) {
    console.error("Er is iets misgegaan:", error);
    res.status(500).json({ error: "Er is iets misgegaan bij het ophalen van de gegevens." });
  }
}
