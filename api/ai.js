// api/aiResponse.js

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Verkrijg de queryparameter 'q' (de systemInstruction)
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ message: 'Parameter q (systemInstruction) is vereist.' });
  }

  // Verzoek om de datum op te halen
  const dateText = await fetchDateText();
  const fullSystemInstruction = `Date info, only use when needed in 24h time: ${dateText}\n\n${q}`;

  // Creëer het requestbody voor de externe API
  const requestBody = {
    messages: [
      { role: "system", content: "Je bent een behulpzame AI-assistent." },
      { role: "user", content: fullSystemInstruction }
    ]
  };

  try {
    // Verstuur de data naar de externe API
    const response = await fetch('https://text.pollinations.ai/openai?stream=true&model=mistral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    // Zorg ervoor dat de ruwe respons wordt doorgestuurd
    const rawData = await response.text();

    // De ruwe respons terugsturen naar de frontend
    return res.status(200).json({ rawData });

  } catch (error) {
    console.error('Fout bij het ophalen van de data:', error);
    return res.status(500).json({ message: 'Er is een fout opgetreden bij het ophalen van data.' });
  }
}

// Functie om de datuminformatie op te halen (kan worden aangepast voor je logica)
async function fetchDateText() {
  try {
    const response = await fetch('https://hrnai.vercel.app/api/date');
    return await response.text();
  } catch (error) {
    console.error('Error fetching date text:', error);
    return '';
  }
}
