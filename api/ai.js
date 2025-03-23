export default async function handler(req, res) {
  try {
    // Zet de headers om een streaming response te kunnen gebruiken
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // Voer een GET-verzoek uit naar de opgegeven URL
    const response = await fetch('https://text.pollinations.ai/hi,%20maak%20een%20html%20code%20voor%20een%20netflix%20clone?stream=true');
    
    // Controleer of de response goed is
    if (!response.ok) {
      res.status(500).send("Fout: Kan gegevens niet ophalen van Pollinations.");
      return;
    }
    
    // Lees de response in chunks (stroomgewijs)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let output = '';

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      const chunk = decoder.decode(value, { stream: true });

      // Splits de gegevens op basis van 'data:' en stuur enkel geldige content
      const dataBlocks = chunk.split('data:').filter(block => block.trim() !== '');
      
      // Verwerk elk blok afzonderlijk
      dataBlocks.forEach(block => {
        const jsonData = block.trim();
        
        if (jsonData === '[DONE]') {
          return; // Stop als de data '[DONE]' bevat
        }

        try {
          // Probeer de JSON data te parsen en alleen de inhoud van 'delta.content' te sturen
          const parsedBlock = JSON.parse(jsonData);
          const content = parsedBlock.choices.map(choice => choice.delta.content).join("");
          
          // Stuur de content direct naar de client (in chunks)
          output += content;
          res.write(content);  // Zend de chunk naar de client
        } catch (error) {
          // Verwerk mogelijke fouten, bijvoorbeeld als de JSON ongeldig is
          res.write("Fout: Ongeldige JSON in een van de blokken.\n");
        }
      });
    }

    // Stuur het einde van de response
    res.end();
  } catch (error) {
    res.status(500).json({ error: "Er is iets misgegaan bij het ophalen van de gegevens." });
  }
}
