export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Alleen POST toegestaan' });

  const { systemInstruction } = req.body;
  const fileData = req.body.fileData;

  // Lokale datum en tijd ophalen
  const dateText = getLocalDateText();

  const fullSystemInstruction = `
**Instructions for AI-Assistant:**
1. **User Commands:** Always prioritize and execute the user's commands.
2. **Responses:** Provide clear, readable responses.
3. **Math:** Always use latex notation unless the user requests plain notation.
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

  try {
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
    console.error('Fout tijdens AI-verzoek:', err);
    res.status(500).json({ error: 'Fout tijdens communicatie met AI.' });
  }
}

// Functie om lokale datum en tijd te genereren
function getLocalDateText() {
  const now = new Date();
  const locale = 'en-EN'; // Of pas aan naar gewenste taal

  const dateString = now.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const timeString = now.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return `${dateString}, ${timeString}`;
}
