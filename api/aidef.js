export default async function handler(req, res) {
  // EDIT: AI herhaald alles per chunk, rest werkt.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { systemInstruction, fileData } = req.body;

    // Haal de datum op van je API
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

    // Zet de request naar Pollinations
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
      const decoder = new TextDecoder();
      let done = false;
      let result = '';

      // Verzamel de response van de AI en stuur deze door naar de frontend
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        result += decoder.decode(value, { stream: true });

        // Verwerk de ontvangen data en stuur deze naar de frontend
        const aiOutput = processData(result);
        res.write(aiOutput); // Verzend de data naar de frontend in realtime

        if (result.includes('data: [DONE]')) {
          break;
        }
      }

      res.end(); // Sluit de response af wanneer de AI-output klaar is

    } catch (error) {
      console.error('Fout bij het ophalen van de data:', error);
      res.status(500).json({ error: 'Fout bij communicatie met de AI.' });
    }
  } else {
    res.status(405).json({ error: 'Alleen POST toegestaan' });
  }
}

async function fetchDateText() {
  try {
    const response = await fetch('https://hrnai.vercel.app/api/date');
    return await response.text();
  } catch (error) {
    console.error('Error fetching date text:', error);
    return '';
  }
}

function processData(data) {
  const lines = data.split('\n');
  let content = '';

  lines.forEach((line) => {
    if (line.startsWith('data: ')) {
      const jsonStr = line.substring(6).trim();
      if (jsonStr === '[DONE]') return;

      try {
        const parsedData = JSON.parse(jsonStr);
        parsedData.choices.forEach((choice) => {
          if (choice.delta && choice.delta.content) {
            content += choice.delta.content;
          }
        });
      } catch (error) {
        console.error('Fout bij het verwerken van de JSON:', error);
      }
    }
  });

  return content;
}
