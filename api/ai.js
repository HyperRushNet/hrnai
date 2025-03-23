// api/fetchData.js
export default async function handler(req, res) {
  try {
    // Stel een reactie in die geschikt is voor streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Voer een GET-verzoek uit naar de opgegeven URL
    const response = await fetch('https://text.pollinations.ai/hi,%20maak%20een%20html%20code%20voor%20een%20github%20clone?stream=true');
    
    // Verwerk de stream van de API response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done, value;

    // Streaming in chunks verwerken en naar de client sturen
    while (!done) {
      ({ done, value } = await reader.read());
      const chunk = decoder.decode(value, { stream: true });

      // Splits de chunk op basis van 'data:' om meerdere data-blokken te extraheren
      const dataBlocks = chunk.split('data:').filter(block => block.trim() !== '');
      dataBlocks.forEach(block => {
        const jsonData = block.trim();
        if (jsonData !== '[DONE]') {
          try {
            // Parse de JSON data en stuur de inhoud naar de client
            const parsedBlock = JSON.parse(jsonData);
            const content = parsedBlock.choices.map(choice => choice.delta.content).join("");
            res.write(`data: ${content}\n\n`); // Stuur de chunk naar de client
          } catch (error) {
            res.write(`data: Fout: Ongeldige JSON in een van de blokken.\n\n`);
          }
        }
      });
    }

    // Sluit de streaming verbinding wanneer de data is opgehaald
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    res.status(500).json({ error: "Er is iets misgegaan bij het ophalen van de gegevens." });
  }
}
