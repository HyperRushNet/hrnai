export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Alleen POST toegestaan' });

  const { systemInstruction, fileData } = req.body;

  try {
    // IP achterhalen
    const forwardedIp = req.headers["x-forwarded-for"]?.split(",")[0];
    const userIp = forwardedIp || "8.8.8.8"; // Fallback IP (Google DNS)

    // Locatiegegevens ophalen obv IP
    const locationResponse = await fetch(`http://ip-api.com/json/${userIp}?fields=66846719`);
    const locationData = await locationResponse.json();

    if (!locationData || locationData.status !== "success") {
      return res.status(500).json({ error: "Kon locatiegegevens niet ophalen." });
    }

    const { timezone } = locationData;

    // Datum en tijd op basis van tijdzone
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

    // Combineer met instructies
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

    if (fileData) {
      requestBody.messages.push({
        role: 'user',
        content: [{ type: 'image_url', image_url: { url: fileData } }],
      });
    }

    // Verstuur naar de AI-backend
    const response = await fetch(
      `https://text.pollinations.ai/openai?stream=true&model=mistral&seed=${seed}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const payload = line.slice(6).trim();
        if (payload === '[DONE]') {
          res.end();
          return;
        }

        try {
          const parsed = JSON.parse(payload);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) res.write(content);
        } catch (err) {
          console.error('Fout bij JSON verwerken:', err);
        }
      }
    }

    res.end();
  } catch (err) {
    console.error('Fout tijdens verwerking:', err);
    res.status(500).json({ error: 'Er ging iets mis tijdens het ophalen van datum/tijd of AI-antwoord.' });
  }
}
