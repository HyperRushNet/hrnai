export default async function handler(req, res) {
  const url = 'https://text.pollinations.ai/hi';

  try {
    const response = await fetch(url);
    const data = await response.text();  // Haal de tekstuele inhoud op

    // Stuur de response terug naar de client
    res.status(200).send(data);
  } catch (error) {
    // Foutafhandeling
    res.status(500).json({ error: 'Error fetching data: ' + error.message });
  }
}
