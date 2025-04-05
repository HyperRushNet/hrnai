export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // CORS headers toevoegen om alle oorsprongen toe te staan
  res.setHeader('Access-Control-Allow-Origin', '*'); // Sta elke domein toe om toegang te krijgen
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS'); // Toegestane methoden
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Toegestane headers

  const { systemInstruction, fileData } = req.body;
  const seed = Math.floor(Math.random() * 1000) + 1;

  const requestBody = {
    messages: [
      { role: 'system', content: 'Je bent een behulpzame AI-assistent.' },
      { role: 'user', content: systemInstruction },
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let previousData = ''; // Hier slaan we de laatste data op

    // Stream de response en verwerk deze chunk per chunk
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      const chunk = decoder.decode(value, { stream: true });

      // Controleer of de nieuwe chunk iets toevoegt dat nog niet in previousData zit
      const newText = chunk.replace(previousData, '');
      previousData += newText;

      // Stuur alleen de nieuwe data door naar de frontend
      res.write(`data: ${JSON.stringify({ text: newText })}\n\n`);

      if (chunk.includes('data: [DONE]')) {
        break;
      }
    }

    // Sluit de stream af
    res.end();
  } catch (error) {
    console.error('Error in API call:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
