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
    // Ontvang de foto
    const chunks = [];
    req.on('data', chunk => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const base64Image = buffer.toString('base64'); // Converteer naar base64

      // Je kunt de base64-string terugsturen naar de frontend
      res.status(200).json({ image: `data:image/jpeg;base64,${base64Image}` });
    });

  } else {
    res.status(405).json({ error: 'Alleen POST toegestaan' });
  }
}
