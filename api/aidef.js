export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Alleen POST toegestaan' });

  const { systemInstruction, fileData } = req.body;

  try {
    let fileBase64 = null;
    if (fileData) {
      fileBase64 = fileData;
    }

    const forwardedIp = req.headers["x-forwarded-for"]?.split(",")[0];
    const userIp = forwardedIp || "8.8.8.8"; // Fallback IP (Google DNS)

    const locationResponse = await fetch(`http://ip-api.com/json/${userIp}?fields=66846719`);
    const locationData = await locationResponse.json();

    if (!locationData || locationData.status !== "success") {
      return res.status(500).json({ error: "Kon locatiegegevens niet ophalen." });
    }

    const { timezone } = locationData;

    const date = new Date();
    const options = {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };

    const formattedDate = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
    const dateText = `Time: ${formattedDate.find(part => part.type === 'hour')?.value}:${formattedDate.find(part => part.type === 'minute')?.value}, Date: ${formattedDate.find(part => part.type === 'day')?.value}/${formattedDate.find(part => part.type === 'month')?.value}/${formattedDate.find(part => part.type === 'year')?.value}, Day of the Week: ${formattedDate.find(part => part.type === 'weekday')?.value}`;

    const fullSystemInstruction = `
**Instructions for AI-Assistant:**
1. **User Commands:** Always prioritize and execute the user's commands.
2. **Responses:** Provide clear, readable responses.
3. **Math:** Always use latex notation unless the user requests plain notation and always use this format $$ E = mc^2 $$ for outline and $ E = mc^2 $ for inline.
Date info: ${dateText}

${systemInstruction}
`.trim();

    const seed = Math.floor(Math.random() * 1000) + 1;
    const requestBody = {
      messages: [
        { role: 'system', content: 'Je bent een behulpzame AI-assistent.' },
        { role: 'user', content: fullSystemInstruction },
      ],
    };

    if (fileBase64) {
      requestBody.messages.push({
        role: 'user',
        content: [{ type: 'image_url', image_url: { url: `data:image/png;base64,${fileBase64}` } }],
      });
    }

    const response = await fetch(
      `https://text.pollinations.ai/openai?stream=false&model=mistral&seed=${seed}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    const responseBody = await response.json();  // Directe respons (geen stream)

    // Controleer of er een geldige AI-respons is en stuur deze naar de frontend
    if (responseBody && responseBody.choices?.[0]?.message?.content) {
      res.status(200).json({ response: responseBody.choices[0].message.content });
    } else {
      console.error('Fout bij het ontvangen van een geldig antwoord:', responseBody);
      res.status(500).json({ error: 'Geen geldig antwoord van de AI ontvangen.' });
    }
  } catch (err) {
    console.error('Fout tijdens verwerking:', err);
    res.status(500).json({ error: `Er ging iets mis: ${err.message}` });
  }
}
