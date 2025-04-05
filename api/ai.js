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
    // Parse JSON request body
    const { file, fullSystemInstruction } = req.body;

    if (file) {
      // Hier ontvang je een base64-gecodeerde afbeelding
      const base64Image = file.split(',')[1]; // Verwijder de data-URL prefix (bijvoorbeeld "data:image/png;base64,")
      
      // Dit is waar je de afbeelding kunt verwerken (bijvoorbeeld opslaan of doorsturen)
      console.log('Ontvangen afbeelding:', base64Image); 

      // Als je de afbeelding ergens naar toe wilt sturen, gebruik dan bijvoorbeeld:
      // await sendFileToServer(base64Image, fullSystemInstruction);

      // Als voorbeeld sturen we de base64 afbeelding terug als antwoord
      return res.status(200).json({
        message: 'Afbeelding ontvangen',
        fileData: base64Image,
      });
    } else {
      // Als er geen bestand is, geef dan een foutmelding
      return res.status(400).json({ error: 'Geen bestand ontvangen' });
    }
  } else {
    res.status(405).json({ error: 'Alleen POST toegestaan' });
  }
}
