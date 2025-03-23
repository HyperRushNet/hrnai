export default async function handler(req, res) {
  try {
    // Stel de headers in om de respons als een stream te behandelen
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Start een fetch request naar de externe API
    const response = await fetch('https://text.pollinations.ai/hi,%20maak%20een%20html%20code%20voor%20een%20kattensite%20clone?stream=true');
    
    // Zet de stream van de API-respons om in een leesbare tekst
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aiOutput = '';

    // Verwerk de stream blokken terwijl ze binnenkomen
    const pump = async () => {
      const { done, value } = await reader.read();

      if (done) {
        // Als de stream klaar is, stuur dan het volledige antwoord
        res.status(200).json({ output: aiOutput.trim() });
        return;
      }

      // Zet de ontvangen waarde om in tekst
      const chunk = decoder.decode(value, { stream: true });
      // Voeg de ontvangen chunk toe aan de output
      aiOutput += chunk;

      // Splits de tekst op basis van 'data:' om individuele blokken te extraheren
      const dataBlocks = chunk.split('data:').filter(block => block.trim() !== '');
      
      dataBlocks.forEach(block => {
        // Verwerk elke data-block als het geen '[DONE]' is
        if (block.trim() !== '[DONE]') {
          try {
            const parsedBlock = JSON.parse(block.trim());
            const content = parsedBlock.choices.map(choice => choice.delta.content).join('');
            aiOutput += content; // Bouw de output op

            // Schrijf de gedeeltelijke inhoud naar de client in real-time
            res.write(JSON.stringify({ output: aiOutput.trim() }) + '\n');
          } catch (error) {
            console.error('Fout bij het verwerken van JSON:', error);
            res.write(JSON.stringify({ error: 'Fout bij het verwerken van JSON.' }) + '\n');
          }
        }
      });

      // Roep de functie opnieuw aan om het volgende blok te verwerken
      pump();
    };

    // Start het verwerken van de stream
    pump();
  } catch (error) {
    console.error('Er is iets misgegaan:', error);
    res.status(500).json({ error: 'Er is iets misgegaan bij het ophalen van de gegevens.' });
  }
}
