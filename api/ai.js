const fetch = require('node-fetch'); // Nodig voor het maken van HTTP-verzoeken in Node.js

exports.handler = async (event) => {
    const systemInstruction = event.systemInstruction || ''; 
    const fileData = event.fileData || null;

    if (!systemInstruction && !fileData) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Please provide a question or upload an image." })
        };
    }

    const dateText = await fetchDateText();
    const fullSystemInstruction = `Date info, only use when needed in 24h time: ${dateText}\n\n${systemInstruction}`;

    const requestBody = {
        messages: [
            { role: "system", content: "Je bent een behulpzame AI-assistent." },
            { role: "user", content: fullSystemInstruction }
        ]
    };

    if (fileData) {
        requestBody.messages.push({
            role: "user",
            content: [{ type: "image_url", image_url: { url: fileData } }],
        });
    }

    try {
        const response = await fetch('https://text.pollinations.ai/openai?stream=true&model=mistral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let result = '';
        
        let responseStream = '';

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            result += decoder.decode(value, { stream: true });

            // Stuur de tussenresultaten als een streaming response
            responseStream += result;
            
            if (result.includes('data: [DONE]')) {
                break;
            }
        }

        // Hier sturen we de uiteindelijke output van de API naar de client.
        return {
            statusCode: 200,
            body: JSON.stringify({ message: responseStream })
        };
    } catch (error) {
        console.error('Fout bij het ophalen van de data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message })
        };
    }
};

// Functie om de datuminformatie op te halen (zoals in je front-end)
async function fetchDateText() {
    try {
        const response = await fetch('https://hrnai.vercel.app/api/date');
        return await response.text();
    } catch (error) {
        console.error('Error fetching date text:', error);
        return '';
    }
}
