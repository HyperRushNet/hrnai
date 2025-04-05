export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    // Gebruik ReadableStream voor streaming
    const readableStream = new ReadableStream({
      start(controller) {
        // Simuleer een lange verwerking of streaming
        const chunks = ['Hallo', ' ', 'wereld', '!'];
        let index = 0;
        
        function push() {
          if (index < chunks.length) {
            controller.enqueue(new TextEncoder().encode(chunks[index]));  // Verzend data
            index++;
            setTimeout(push, 250);  // Simuleer vertraging
          } else {
            controller.close();  // Sluit stream als alle chunks zijn verzonden
          }
        }

        push();  // Start de streaming
      }
    });

    // Zet de response headers en begin de streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200);
    const stream = readableStream.pipeTo(new WritableStream({
      write(chunk) {
        res.write(chunk);
      },
      close() {
        res.end();
      }
    }));

    stream.catch((err) => {
      res.status(500).send('Fout bij streamen: ' + err.message);
    });
    
  } else {
    res.status(405).json({ error: 'Alleen POST toegestaan' });
  }
}
