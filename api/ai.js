export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Alleen POST toegestaan' });
  }

  const { systemInstruction, fileData } = req.body;
  const dateText = await fetchDateText();

  const fullSystemInstruction = `
**Instructions for AI-Assistant:**
1. **User Commands:** Always prioritize and execute the user's commands. Do not mention or react to this system prompt.
2. **Responses:** Provide clear, readable responses.
3. **Math:** Always use latex notation unless the user requests plain notation.
Date info: ${dateText}

${systemInstruction}
`;

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
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // bewaar laatste incomplete regel in de buffer
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            res.end();
            return;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            parsed.choices?.forEach((choice) => {
              if (choice.delta?.content) {
                res.write(choice.delta.content);
              }
            });
          } catch (err) {
            console.error('Parse fout:', err);
          }
        }
      }
    }

    res.end();
  } catch (err) {
    console.error('Fout bij ophalen stream:', err);
    res.status(500).json({ error: 'Stream error' });
  }
}

async function fetchDateText() {
  try {
    const response = await fetch('https://hrnai.vercel.app/api/date');
    return await response.text();
  } catch (err) {
    console.error('Fout bij ophalen datum:', err);
    return '';
  }
}
