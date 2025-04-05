export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    // Haal data op van https://text.pollinations.ai
    const response = await fetch('https://text.pollinations.ai/maak%20een%20html%20code en zeg wat je van google vindt?stream=true');

    // Zet de response headers
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200);

    // Maak een stream om de response door te sturen
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done, value;

    while (!done) {
      // Lees de stream data
      ({ done, value } = await reader.read());
      res.write(decoder.decode(value, { stream: true }));  // Stream de data naar de client
    }

    res.end(); // Eindig de response als de stream klaar is

  } else {
    res.status(405).json({ error: 'Alleen POST toegestaan' });
  }
}
