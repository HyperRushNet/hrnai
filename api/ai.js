export default async function handler(req, res) {
  const url = 'https://text.pollinations.ai/hi,%20maak%20een%20html%20code?stream=true';

  try {
    const response = await fetch(url);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const stream = new ReadableStream({
      start(controller) {
        function push() {
          reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            const text = decoder.decode(value, { stream: true });
            controller.enqueue(text);
            push();  // Keep reading the stream
          }).catch(err => {
            controller.error(err);
          });
        }
        push();
      }
    });

    // Create a stream of text content and pipe it to the response
    const streamResponse = new Response(stream);
    const streamText = await streamResponse.text();
    
    res.status(200).send(streamText);

  } catch (error) {
    res.status(500).json({ error: 'Error fetching the stream: ' + error.message });
  }
}
